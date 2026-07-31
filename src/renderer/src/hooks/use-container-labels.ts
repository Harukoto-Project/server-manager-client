import { useEffect } from "react";
import { useContainerLabelsStore } from "@renderer/state/container-labels-store";

/** ノード配下のDockerコンテナラベル一覧を読み込み、ラベルの参照/更新用APIを返す */
export function useContainerLabels(nodeId: string | undefined) {
	const load = useContainerLabelsStore((s) => s.load);
	const setLabelAction = useContainerLabelsStore((s) => s.setLabel);
	const labels = useContainerLabelsStore((s) => (nodeId ? s.labelsByNode[nodeId] : undefined)) ?? {};

	useEffect(() => {
		if (nodeId) load(nodeId);
	}, [nodeId, load]);

	async function setLabel(containerId: string, label: string): Promise<void> {
		if (!nodeId) return;
		await setLabelAction(nodeId, containerId, label);
	}

	return { labels, setLabel };
}
