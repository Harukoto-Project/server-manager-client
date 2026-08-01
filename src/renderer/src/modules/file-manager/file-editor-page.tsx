import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, readFile, writeFile } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

export function FileEditorPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const [searchParams] = useSearchParams();
	const filePath = searchParams.get("path") ?? "";
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [content, setContent] = useState("");
	const [dirty, setDirty] = useState(false);

	const ready = Boolean(node && token && filePath);

	const readQuery = useQuery({
		queryKey: ["file-manager-read", nodeId, filePath],
		queryFn: () => readFile(node!, token!, filePath),
		enabled: ready,
		retry: 1,
	});

	useEffect(() => {
		if (readQuery.data && !readQuery.data.isBinary && readQuery.data.content !== null) {
			setContent(readQuery.data.content);
			setDirty(false);
		}
	}, [readQuery.data]);

	const saveMutation = useMutation({
		mutationFn: () => writeFile(node!, token!, filePath, content),
		onSuccess: () => {
			setDirty(false);
			queryClient.invalidateQueries({ queryKey: ["file-manager-read", nodeId, filePath] });
		},
	});

	const handleSave = useCallback(() => {
		if (dirty && !saveMutation.isPending) saveMutation.mutate();
	}, [dirty, saveMutation]);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				handleSave();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleSave]);

	const fileName = filePath.split("/").at(-1) ?? filePath;
	const backPath = "../";

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。";
	else if (!filePath) statusMessage = "ファイルパスが指定されていません。";
	else if (tokenLoading || readQuery.isLoading) statusMessage = "読み込み中...";
	else if (readQuery.isError)
		statusMessage =
			readQuery.error instanceof NodeApiError ? readQuery.error.message : "ファイルを読み取れませんでした。";

	const isBinary = readQuery.data?.isBinary ?? false;

	return (
		<DashboardPageLayout
			title={fileName}
			description={filePath}
			backTo={backPath}
			backLabel="ファイル一覧に戻る"
			fillHeight={!isBinary && !statusMessage}
			actions={
				!isBinary &&
				!statusMessage && (
					<Button
						size="sm"
						disabled={!dirty || saveMutation.isPending}
						onClick={handleSave}
					>
						<Save className="mr-1.5 h-4 w-4" />
						{saveMutation.isPending ? "保存中..." : dirty ? "保存 (Ctrl+S)" : "保存済み"}
					</Button>
				)
			}
		>
			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}

			{isBinary && (
				<div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
					<p className="text-sm text-muted-foreground">このファイルはテキストエディタで編集できません。</p>
				</div>
			)}

			{saveMutation.isError && (
				<p className="mb-2 text-sm text-destructive">
					{saveMutation.error instanceof NodeApiError ? saveMutation.error.message : "保存に失敗しました。"}
				</p>
			)}

			{!statusMessage && !isBinary && (
				<textarea
					className="h-full w-full resize-none rounded-lg border border-border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					value={content}
					onChange={(e) => {
						setContent(e.target.value);
						setDirty(true);
					}}
					spellCheck={false}
				/>
			)}
		</DashboardPageLayout>
	);
}
