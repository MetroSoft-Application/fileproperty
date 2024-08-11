import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ファイルプロパティのツリービューに表示する項目を表します。
 */
class TreeItem extends vscode.TreeItem {
	/**
	 * TreeItemのインスタンスを作成します。
	 * @param {string} label - ツリーアイテムのラベル。
	 * @param {vscode.TreeItemCollapsibleState} collapsibleState - ツリーアイテムの折りたたみ状態。
	 * @param {vscode.Command} [command] - ツリーアイテムが選択されたときに実行されるコマンド。
	 */
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}`;
	}
}

/**
 * ファイルプロパティのツリービューにデータを提供するクラスです。
 */
class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private fileUri: vscode.Uri | undefined;
	private cachedFileDetails: { label: string, value: string; }[] = [];

	/**
	 * ファイルサイズを適切な単位（バイト、KB、MB、GB）でフォーマットする関数です。
	 * @param {number} bytes - ファイルサイズ（バイト単位）。
	 * @returns {string} - フォーマットされたファイルサイズ。
	 */
	private formatFileSize(bytes: number): string {
		const units = ['bytes', 'KB', 'MB', 'GB'];
		let unitIndex = 0;

		while (bytes >= 1024 && unitIndex < units.length - 1) {
			bytes /= 1024;
			unitIndex++;
		}

		return `${bytes.toFixed(2)} ${units[unitIndex]}`;
	}

	/**
	 * ファイルの詳細情報（名前、パス、サイズ、作成日時、更新日時）を取得します。
	 * @returns {{label: string, value: string}[]} - ファイルの詳細情報を格納したオブジェクトの配列。
	 */
	private getFileDetails(): { label: string, value: string; }[] {
		if (!this.fileUri) {
			return [];
		}

		try {
			const stats = fs.statSync(this.fileUri.fsPath);

			const fileName = path.basename(this.fileUri.fsPath);
			const filePath = this.fileUri.fsPath;
			const fileSize = this.formatFileSize(stats.size);
			const createdDate = stats.birthtime.toLocaleString();
			const modifiedDate = stats.mtime.toLocaleString();

			this.cachedFileDetails = [
				{ label: 'File Name', value: fileName },
				{ label: 'File Path', value: filePath },
				{ label: 'File Size', value: fileSize },
				{ label: 'Created Date', value: createdDate },
				{ label: 'Modified Date', value: modifiedDate }
			];

		} catch (error) {
			// エラーが発生した場合はキャッシュを使用
			if (this.cachedFileDetails.length === 0) {
				// キャッシュがない場合の初期表示内容
				this.cachedFileDetails = [
					{ label: 'File Name', value: path.basename(this.fileUri.fsPath) },
					{ label: 'File Path', value: this.fileUri.fsPath },
					{ label: 'Info', value: 'File is not saved or cannot be accessed.' }
				];
			}
		}

		return this.cachedFileDetails;
	}

	/**
	 * 現在選択されているファイルのURIを設定し、ツリービューを更新します。
	 * @param {vscode.Uri} uri - ファイルのURI。
	 */
	setFileUri(uri: vscode.Uri) {
		this.fileUri = uri;
		this._onDidChangeTreeData.fire();
	}

	/**
	 * 指定された要素に対応するツリーアイテムを取得します。
	 * @param {TreeItem} element - ツリーアイテムの要素。
	 * @returns {vscode.TreeItem} - 対応するツリーアイテム。
	 */
	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * 指定されたツリーアイテムの子要素を取得します。
	 * @param {TreeItem} [element] - 親ツリーアイテム。
	 * @returns {Thenable<TreeItem[]>} - 子ツリーアイテムの配列を返すPromise。
	 */
	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		const details = this.getFileDetails();
		const fileItems = details.map(detail =>
			new TreeItem(`${detail.label}: ${detail.value}`, vscode.TreeItemCollapsibleState.None)
		);

		return Promise.resolve(fileItems);
	}

	/**
	 * すべてのファイル詳細をフォーマットされた文字列として取得します。
	 * @returns {string} - すべてのファイル詳細を表す文字列。
	 */
	getAllItemsAsString(): string {
		const details = this.getFileDetails();
		return details.map(detail => `${detail.label}: ${detail.value}`).join('\n');
	}

	/**
	 * ツリービューを更新するために変更イベントを発火させます。
	 */
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}

/**
 * この拡張機能を有効化する際に、ツリーデータプロバイダーとコマンドを登録します。
 * @param {vscode.ExtensionContext} context - 拡張機能のコンテキスト。
 */
export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new TreeDataProvider();
	vscode.window.registerTreeDataProvider('myTreeView', treeDataProvider);

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor && editor.document && editor.document.uri) {
			treeDataProvider.setFileUri(editor.document.uri);
		}
	});

	vscode.commands.registerCommand('fileProperty.copyTreeItemContext', (item: TreeItem) => {
		const content = item.label;
		vscode.env.clipboard.writeText(content);
		vscode.window.showInformationMessage(`Copied: ${content}`);
	});

	vscode.commands.registerCommand('fileProperty.copyAllTreeItemsContext', () => {
		const allItemsContent = treeDataProvider.getAllItemsAsString();
		vscode.env.clipboard.writeText(allItemsContent);
		vscode.window.showInformationMessage(`Copied all items.`);
	});
}

/**
 * この拡張機能を無効化する際に呼び出される関数。現在は特に処理はありません。
 */
export function deactivate() { }
