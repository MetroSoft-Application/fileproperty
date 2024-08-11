"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
/**
 * ファイルプロパティのツリービューに表示する項目を表します。
 */
var TreeItem = /** @class */ (function (_super) {
    __extends(TreeItem, _super);
    /**
     * TreeItemのインスタンスを作成します。
     * @param {string} label - ツリーアイテムのラベル。
     * @param {vscode.TreeItemCollapsibleState} collapsibleState - ツリーアイテムの折りたたみ状態。
     * @param {vscode.Command} [command] - ツリーアイテムが選択されたときに実行されるコマンド。
     */
    function TreeItem(label, collapsibleState, command) {
        var _this = _super.call(this, label, collapsibleState) || this;
        _this.label = label;
        _this.collapsibleState = collapsibleState;
        _this.command = command;
        _this.tooltip = "".concat(_this.label);
        return _this;
    }
    return TreeItem;
}(vscode.TreeItem));
/**
 * ファイルプロパティのツリービューにデータを提供するクラスです。
 */
var TreeDataProvider = /** @class */ (function () {
    function TreeDataProvider() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.cachedFileDetails = [];
    }
    /**
     * ファイルサイズを適切な単位（バイト、KB、MB、GB）でフォーマットする関数です。
     * @param {number} bytes - ファイルサイズ（バイト単位）。
     * @returns {string} - フォーマットされたファイルサイズ。
     */
    TreeDataProvider.prototype.formatFileSize = function (bytes) {
        var units = ['bytes', 'KB', 'MB', 'GB'];
        var unitIndex = 0;
        while (bytes >= 1024 && unitIndex < units.length - 1) {
            bytes /= 1024;
            unitIndex++;
        }
        return "".concat(bytes.toFixed(2), " ").concat(units[unitIndex]);
    };
    /**
     * ファイルの行数をカウントします。
     * @returns {number | null} - ファイルの行数。テキストファイルでない場合はnull。
     */
    TreeDataProvider.prototype.countFileLines = function () {
        if (!this.fileUri) {
            return null;
        }
        try {
            var content = fs.readFileSync(this.fileUri.fsPath, 'utf-8');
            return content.split(/\r\n|\r|\n/).length;
        }
        catch (_a) {
            // テキストファイルでない場合
            return null;
        }
    };
    /**
     * ファイルの詳細情報（名前、パス、サイズ、作成日時、更新日時、行数）を取得します。
     * @returns {{label: string, value: string}[]} - ファイルの詳細情報を格納したオブジェクトの配列。
     */
    TreeDataProvider.prototype.getFileDetails = function () {
        if (!this.fileUri) {
            return [];
        }
        try {
            var stats = fs.statSync(this.fileUri.fsPath);
            var fileName = path.basename(this.fileUri.fsPath);
            var filePath = this.fileUri.fsPath;
            var fileSize = this.formatFileSize(stats.size);
            var createdDate = stats.birthtime.toLocaleString();
            var modifiedDate = stats.mtime.toLocaleString();
            var lineCount = this.countFileLines();
            this.cachedFileDetails = [
                { label: 'File Name', value: fileName },
                { label: 'File Path', value: filePath },
                { label: 'File Size', value: fileSize },
                { label: 'Created Date', value: createdDate },
                { label: 'Modified Date', value: modifiedDate }
            ];
            if (lineCount !== null) {
                this.cachedFileDetails.push({ label: 'Line Count', value: lineCount.toString() });
            }
            else {
                this.cachedFileDetails.push({ label: 'Line Count', value: 'Not applicable' });
            }
        }
        catch (error) {
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
    };
    /**
     * 現在選択されているファイルのURIを設定し、ツリービューを更新します。
     * @param {vscode.Uri} uri - ファイルのURI。
     */
    TreeDataProvider.prototype.setFileUri = function (uri) {
        this.fileUri = uri;
        this._onDidChangeTreeData.fire();
    };
    /**
     * 指定された要素に対応するツリーアイテムを取得します。
     * @param {TreeItem} element - ツリーアイテムの要素。
     * @returns {vscode.TreeItem} - 対応するツリーアイテム。
     */
    TreeDataProvider.prototype.getTreeItem = function (element) {
        return element;
    };
    /**
     * 指定されたツリーアイテムの子要素を取得します。
     * @param {TreeItem} [element] - 親ツリーアイテム。
     * @returns {Thenable<TreeItem[]>} - 子ツリーアイテムの配列を返すPromise。
     */
    TreeDataProvider.prototype.getChildren = function (element) {
        var details = this.getFileDetails();
        var fileItems = details.map(function (detail) {
            return new TreeItem("".concat(detail.label, ": ").concat(detail.value), vscode.TreeItemCollapsibleState.None);
        });
        return Promise.resolve(fileItems);
    };
    /**
     * すべてのファイル詳細をフォーマットされた文字列として取得します。
     * @returns {string} - すべてのファイル詳細を表す文字列。
     */
    TreeDataProvider.prototype.getAllItemsAsString = function () {
        var details = this.getFileDetails();
        return details.map(function (detail) { return "".concat(detail.label, ": ").concat(detail.value); }).join('\n');
    };
    /**
     * ツリービューを更新するために変更イベントを発火させます。
     */
    TreeDataProvider.prototype.refresh = function () {
        this._onDidChangeTreeData.fire();
    };
    return TreeDataProvider;
}());
/**
 * この拡張機能を有効化する際に、ツリーデータプロバイダーとコマンドを登録します。
 * @param {vscode.ExtensionContext} context - 拡張機能のコンテキスト。
 */
function activate(context) {
    var treeDataProvider = new TreeDataProvider();
    vscode.window.registerTreeDataProvider('myTreeView', treeDataProvider);
    vscode.window.onDidChangeActiveTextEditor(function (editor) {
        if (editor && editor.document && editor.document.uri) {
            treeDataProvider.setFileUri(editor.document.uri);
        }
    });
    vscode.commands.registerCommand('fileProperty.copyTreeItemContext', function (item) {
        var content = item.label;
        vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage("Copied: ".concat(content));
    });
    vscode.commands.registerCommand('fileProperty.copyAllTreeItemsContext', function () {
        var allItemsContent = treeDataProvider.getAllItemsAsString();
        vscode.env.clipboard.writeText(allItemsContent);
        vscode.window.showInformationMessage("Copied all items.");
    });
}
exports.activate = activate;
/**
 * この拡張機能を無効化する際に呼び出される関数。現在は特に処理はありません。
 */
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map