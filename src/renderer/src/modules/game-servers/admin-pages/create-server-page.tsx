import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Rocket } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Switch } from "@renderer/components/ui/switch";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type CreateGameServerInput,
	createGameServer,
	listAvailableAllocationsForNode,
	listNodesForServerCreation,
} from "@renderer/lib/api/game-servers/create-server";
import { fetchEggs, fetchNests } from "@renderer/lib/api/game-servers/nests-eggs";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const selectClassName = inputClassName;

/**
 * サーバー作成ページ。Nest→Egg→Egg変数→ノード→アロケーション→リソース上限→サーバー名、の順に
 * 1画面フォームで入力させ、作成成功後は該当サーバーの詳細ページに遷移する。
 *
 * Nest/Egg一覧は`/game-servers/admin/nests-eggs`のAPIを、ノード/アロケーション一覧は
 * このフォーム専用の補助エンドポイント(`/game-servers/admin/create-server/nodes...`)を利用する。
 */
export function CreateServerPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const ready = Boolean(node && token);

	const [nestId, setNestId] = useState("");
	const [eggId, setEggId] = useState("");
	const [environment, setEnvironment] = useState<Record<string, string>>({});
	const [dockerImage, setDockerImage] = useState("");
	const [startup, setStartup] = useState("");

	const [pterodactylNodeId, setPterodactylNodeId] = useState("");
	const [allocationId, setAllocationId] = useState("");

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [ownerUserId, setOwnerUserId] = useState("");

	const [memory, setMemory] = useState("1024");
	const [swap, setSwap] = useState("0");
	const [disk, setDisk] = useState("2048");
	const [io, setIo] = useState("500");
	const [cpu, setCpu] = useState("100");
	const [databasesLimit, setDatabasesLimit] = useState("0");
	const [allocationsLimit, setAllocationsLimit] = useState("0");
	const [backupsLimit, setBackupsLimit] = useState("0");
	const [startOnCompletion, setStartOnCompletion] = useState(true);

	const [formError, setFormError] = useState<string | null>(null);

	const nestsQuery = useQuery({
		queryKey: ["create-server-nests", nodeId],
		queryFn: () => fetchNests(node!, token!),
		enabled: ready,
	});

	const eggsQuery = useQuery({
		queryKey: ["create-server-eggs", nodeId, nestId],
		queryFn: () => fetchEggs(node!, token!, Number(nestId)),
		enabled: ready && Boolean(nestId),
	});

	const nodesQuery = useQuery({
		queryKey: ["create-server-nodes", nodeId],
		queryFn: () => listNodesForServerCreation(node!, token!),
		enabled: ready,
	});

	const allocationsQuery = useQuery({
		queryKey: ["create-server-allocations", nodeId, pterodactylNodeId],
		queryFn: () => listAvailableAllocationsForNode(node!, token!, Number(pterodactylNodeId)),
		enabled: ready && Boolean(pterodactylNodeId),
	});

	const selectedEgg = useMemo(
		() => eggsQuery.data?.find((egg) => String(egg.id) === eggId),
		[eggsQuery.data, eggId],
	);

	const createMutation = useMutation({
		mutationFn: (input: CreateGameServerInput) => createGameServer(node!, token!, input),
		onSuccess: (server) => {
			navigate(`/nodes/${nodeId}/game-servers/${server.identifier}`);
		},
		onError: (error) => {
			setFormError(error instanceof NodeApiError ? error.message : "サーバーの作成に失敗しました。");
		},
	});

	function handleSelectNest(value: string) {
		setNestId(value);
		setEggId("");
		setEnvironment({});
		setDockerImage("");
		setStartup("");
	}

	function handleSelectEgg(value: string) {
		setEggId(value);
		const egg = eggsQuery.data?.find((e) => String(e.id) === value);
		if (egg) {
			setEnvironment(Object.fromEntries(egg.variables.map((v) => [v.envVariable, v.defaultValue])));
			setDockerImage(egg.dockerImage);
			setStartup(egg.startup);
		} else {
			setEnvironment({});
			setDockerImage("");
			setStartup("");
		}
	}

	function handleSelectNode(value: string) {
		setPterodactylNodeId(value);
		setAllocationId("");
	}

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setFormError(null);

		if (!selectedEgg) {
			setFormError("Eggを選択してください。");
			return;
		}
		if (!allocationId) {
			setFormError("アロケーション(IP:ポート)を選択してください。");
			return;
		}
		if (!name.trim()) {
			setFormError("サーバー名を入力してください。");
			return;
		}
		const ownerId = Number(ownerUserId);
		if (!ownerId || ownerId <= 0) {
			setFormError("所有者ユーザーID(Pterodactylパネル上のユーザーID)を入力してください。");
			return;
		}

		createMutation.mutate({
			name: name.trim(),
			description: description.trim() || undefined,
			userId: ownerId,
			eggId: selectedEgg.id,
			dockerImage: dockerImage.trim() || selectedEgg.dockerImage,
			startup: startup.trim() || selectedEgg.startup,
			environment,
			limits: {
				memory: Number(memory) || 0,
				swap: Number(swap) || 0,
				disk: Number(disk) || 0,
				io: Number(io) || 500,
				cpu: Number(cpu) || 0,
			},
			featureLimits: {
				databases: Number(databasesLimit) || 0,
				allocations: Number(allocationsLimit) || 0,
				backups: Number(backupsLimit) || 0,
			},
			allocation: { defaultAllocationId: Number(allocationId) },
			startOnCompletion,
		});
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading) statusMessage = "接続中...";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="サーバー作成"
			description="Nest/Egg/ノード/割り当てリソースを選択して新規サーバーを作成します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6 pb-8">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">1. Nest・Eggの選択</CardTitle>
						<CardDescription>作成するサーバーの雛形(Egg)を、分類(Nest)から選びます。</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="nest-select">
								Nest
							</label>
							<select
								id="nest-select"
								value={nestId}
								onChange={(e) => handleSelectNest(e.target.value)}
								className={selectClassName}
								disabled={!ready || nestsQuery.isLoading}
							>
								<option value="">選択してください</option>
								{nestsQuery.data?.map((nest) => (
									<option key={nest.id} value={nest.id}>
										{nest.name}
									</option>
								))}
							</select>
							{nestsQuery.isError && <p className="text-xs text-destructive">Nest一覧の取得に失敗しました。</p>}
						</div>

						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="egg-select">
								Egg
							</label>
							<select
								id="egg-select"
								value={eggId}
								onChange={(e) => handleSelectEgg(e.target.value)}
								className={selectClassName}
								disabled={!nestId || eggsQuery.isLoading}
							>
								<option value="">選択してください</option>
								{eggsQuery.data?.map((egg) => (
									<option key={egg.id} value={egg.id}>
										{egg.name}
									</option>
								))}
							</select>
							{eggsQuery.isError && <p className="text-xs text-destructive">Egg一覧の取得に失敗しました。</p>}
						</div>

						{selectedEgg && (
							<>
								<div className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground" htmlFor="docker-image">
										Dockerイメージ
									</label>
									<input
										id="docker-image"
										value={dockerImage}
										onChange={(e) => setDockerImage(e.target.value)}
										className={`${inputClassName} font-mono`}
									/>
								</div>
								<div className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground" htmlFor="startup-command">
										起動コマンド
									</label>
									<textarea
										id="startup-command"
										value={startup}
										onChange={(e) => setStartup(e.target.value)}
										rows={2}
										className={`${inputClassName} font-mono`}
									/>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{selectedEgg && selectedEgg.variables.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">2. Egg変数(環境変数)</CardTitle>
							<CardDescription>選択したEggに応じた環境変数です。デフォルト値から変更できます。</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{selectedEgg.variables.map((variable) => (
								<div key={variable.id} className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground" htmlFor={`env-${variable.id}`}>
										{variable.name}({variable.envVariable}){!variable.isEditable && " - 編集不可"}
									</label>
									<input
										id={`env-${variable.id}`}
										value={environment[variable.envVariable] ?? ""}
										onChange={(e) =>
											setEnvironment((prev) => ({ ...prev, [variable.envVariable]: e.target.value }))
										}
										disabled={!variable.isEditable}
										className={`${inputClassName} font-mono`}
									/>
									{variable.description && (
										<p className="text-xs text-muted-foreground">{variable.description}</p>
									)}
								</div>
							))}
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="text-base">3. ノード・アロケーションの選択</CardTitle>
						<CardDescription>サーバーを配置するノードと、使用するIP:ポートを選びます。</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="node-select">
								ノード
							</label>
							<select
								id="node-select"
								value={pterodactylNodeId}
								onChange={(e) => handleSelectNode(e.target.value)}
								className={selectClassName}
								disabled={!ready || nodesQuery.isLoading}
							>
								<option value="">選択してください</option>
								{nodesQuery.data?.map((n) => (
									<option key={n.id} value={n.id} disabled={n.isMaintenanceMode}>
										{n.name}({n.fqdn}){n.isMaintenanceMode && " - メンテナンス中"}
									</option>
								))}
							</select>
							{nodesQuery.isError && <p className="text-xs text-destructive">ノード一覧の取得に失敗しました。</p>}
						</div>

						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="allocation-select">
								アロケーション(IP:ポート)
							</label>
							<select
								id="allocation-select"
								value={allocationId}
								onChange={(e) => setAllocationId(e.target.value)}
								className={selectClassName}
								disabled={!pterodactylNodeId || allocationsQuery.isLoading}
							>
								<option value="">選択してください</option>
								{allocationsQuery.data?.map((allocation) => (
									<option key={allocation.id} value={allocation.id}>
										{allocation.ipAlias ?? allocation.ip}:{allocation.port}
									</option>
								))}
							</select>
							{allocationsQuery.isSuccess && allocationsQuery.data.length === 0 && (
								<p className="text-xs text-muted-foreground">
									このノードには未割り当てのアロケーションがありません。先にアロケーション管理から追加してください。
								</p>
							)}
							{allocationsQuery.isError && (
								<p className="text-xs text-destructive">アロケーション一覧の取得に失敗しました。</p>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">4. リソース上限</CardTitle>
						<CardDescription>0を指定すると無制限になる項目があります(パネルの仕様に準じます)。</CardDescription>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<NumberField label="メモリ(MB)" value={memory} onChange={setMemory} />
						<NumberField label="スワップ(MB)" value={swap} onChange={setSwap} />
						<NumberField label="ディスク(MB)" value={disk} onChange={setDisk} />
						<NumberField label="ブロックIO重み(10-1000)" value={io} onChange={setIo} />
						<NumberField label="CPU上限(%、100=1コア)" value={cpu} onChange={setCpu} />
						<NumberField label="データベース上限数" value={databasesLimit} onChange={setDatabasesLimit} />
						<NumberField label="アロケーション上限数" value={allocationsLimit} onChange={setAllocationsLimit} />
						<NumberField label="バックアップ上限数" value={backupsLimit} onChange={setBackupsLimit} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">5. サーバー情報</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="server-name">
								サーバー名
							</label>
							<input
								id="server-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="my-minecraft-server"
								className={inputClassName}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="server-description">
								説明(任意)
							</label>
							<input
								id="server-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className={inputClassName}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="owner-user-id">
								所有者ユーザーID(Pterodactylパネル上のユーザーID)
							</label>
							<input
								id="owner-user-id"
								value={ownerUserId}
								onChange={(e) => setOwnerUserId(e.target.value)}
								placeholder="1"
								className={`${inputClassName} font-mono`}
							/>
							<p className="text-xs text-muted-foreground">
								「パネルユーザー管理」でユーザー一覧を確認し、そのIDを入力してください。
							</p>
						</div>
						<div className="flex items-center justify-between rounded-lg border bg-card p-3">
							<div>
								<p className="text-sm font-medium">インストール完了後に自動起動</p>
								<p className="text-xs text-muted-foreground">オフにすると作成後に手動で起動する必要があります</p>
							</div>
							<Switch checked={startOnCompletion} onCheckedChange={setStartOnCompletion} />
						</div>
					</CardContent>
				</Card>

				{formError && <p className="text-sm text-destructive">{formError}</p>}

				<div className="flex justify-end">
					<Button type="submit" disabled={!ready || createMutation.isPending}>
						{createMutation.isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" /> 作成中...
							</>
						) : (
							<>
								<Rocket className="h-4 w-4" /> サーバーを作成
							</>
						)}
					</Button>
				</div>
			</form>
		</DashboardPageLayout>
	);
}

function NumberField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-1">
			<label className="text-xs font-medium text-muted-foreground">{label}</label>
			<input
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={inputClassName}
			/>
		</div>
	);
}
