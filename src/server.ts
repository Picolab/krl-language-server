#!/usr/bin/env node
console.log("the server started")
import {
	createConnection,
	TextDocuments,
	TextDocument,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	SymbolInformation,
	TextDocumentIdentifier,
	TextDocumentItem,
	CompletionParams,
	Diagnostic,
	CompletionItemKind,
} from 'vscode-languageserver';
import { getCompletions} from './completion';
import { analyzeKRLDocument, krlAnalysisResults } from './analyze';
import { deleteCacheEntry, getCachedAnalysis, updateCachedAnalysis } from './documentInfoCache';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();


let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: [ '.' ]
			},
			documentSymbolProvider: true
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(processKRLDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'krlLanguageServer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	deleteCacheEntry(e.document)
});

async function processKRLDocument(document: TextDocument) {
	let settings = await getDocumentSettings(document.uri);
	console.log("Attempting to process KRL document")
	// Analyze the new text document
	let analysis: krlAnalysisResults = analyzeKRLDocument(document)
	// update our cache with the results so that future queries on document info can be resolved
	updateCachedAnalysis(document, analysis);
	// connection.sendDiagnostics(analysis.diagnostics)
	console.log("Sending diagnostics")
	connection.sendDiagnostics({ uri: document.uri, diagnostics: analysis.diagnostics});
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	let document : TextDocument = change.document
	processKRLDocument(document)
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function getCachedCompletionItems(textDocumentID: TextDocumentIdentifier): CompletionItem[] {
	let document: TextDocument | undefined = documents.get(textDocumentID.uri)
	let completionItems: CompletionItem[] = []
	if (document) {
		let analysis: krlAnalysisResults | undefined = getCachedAnalysis(document);
		if (analysis) {
			completionItems = analysis.completionItems
		}
		
	}
	return completionItems
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(completionParams: CompletionParams): CompletionItem[] => {
		// let textDocumentID: TextDocumentIdentifier = completionParams.textDocument
		// return getCompletions(completionParams).concat(getCachedCompletionItems(textDocumentID))
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);



connection.onDocumentSymbol(
	(params): SymbolInformation[] => {
		let documentID: TextDocumentIdentifier = params.textDocument
		let document: TextDocument | undefined = documents.get(documentID.uri)
		let symbols: SymbolInformation[] = []
		if (document) {
			let analysis = getCachedAnalysis(document)
			if (analysis) {
				symbols = analysis.documentSymbols
			}
		}
		return symbols
	}
)


connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	let txtDocItem : TextDocumentItem = params.textDocument;
	let textDocument : TextDocument = TextDocument.create(txtDocItem.uri, txtDocItem.languageId, txtDocItem.version, txtDocItem.text)
	// processKRLDocument(textDocument)
	//connection.console.log(`${params.textDocument.uri} opened.`);
});
/*
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
