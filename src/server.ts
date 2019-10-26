#!/usr/bin/env node

import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	RequestHandler,
	DocumentSymbolParams,
	SymbolInformation,
	TextDocumentIdentifier,
	SymbolKind,
	Position,
	Range,
	DocumentSymbolRequest,
	TextDocumentItem,
	TextEdit,
	CompletionTriggerKind,
	CompletionParams,
	CompletionContext,
	RegistrationRequest,
	DocumentOnTypeFormattingParams
} from 'vscode-languageserver';
import krlCompiler from 'krl-compiler';
import krlParser from 'krl-parser';
import { documentSymbol } from './documentSymbol';
import { getCompletions, traverseAST } from './completion';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

interface docCache {
	ast:any
	symbolInformation : SymbolInformation[],
	completionItems: CompletionItem[]
}

namespace docCache {
	export function create(ast:any = null, symbolInfo : SymbolInformation[] = [], completionItems : CompletionItem[] = []) : docCache {
		return {
			ast: ast,
			symbolInformation: symbolInfo,
			completionItems: completionItems
		}
	}
}



let documentCache: Map<string, docCache> = new Map();

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
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	documentCache.delete(e.document.uri)
});

function updateCache(textDocument: TextDocument) {
	let text: string = textDocument.getText();
	let newAst: any = undefined;
	let symbolInfo: SymbolInformation[] = []
	let completionItems: CompletionItem[] = []
	try {
		newAst = krlParser(text);
		symbolInfo = documentSymbol(textDocument, newAst);
		completionItems = [...new Set(traverseAST(newAst))]
	} catch(e) {
		 return;
	}
	if (newAst) {
		let cache = documentCache.get(textDocument.uri);
		if (!cache) {
			cache = docCache.create()
			documentCache.set(textDocument.uri, cache)
		}
		cache.ast = newAst;
		cache.symbolInformation = symbolInfo
		cache.completionItems = completionItems
	}
}


// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
	updateCache(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	let text = textDocument.getText();
	let problems = 0;
	let diagnostics: Diagnostic[] = [];

	// Below code structure taken from worker.js in the krl-editor of the pico-engine repo.
	try{
		let out = krlCompiler(text)
		out.warnings.forEach(function(w: any){
			diagnostics.push({
				range: {
					start: {
						line: w.loc.start.line - 1,
						character: w.loc.start.column,
					},
					end: {
						line: w.loc.start.line,
						character: 0
					}
				},
				message: w.message,
				severity: DiagnosticSeverity.Warning
			});
		});
	}catch(err){
		if(err.where && err.where.line){
			diagnostics.push({
				range: {
					start: {
						line: err.where.line - 1,
						character: err.where.col - 1,
					},
					end: {
						line: err.where.line,
						character: 0
					}
				},
				message: err + "",
				severity: DiagnosticSeverity.Error
			});
		}else if(err.krl_compiler && err.krl_compiler.loc && err.krl_compiler.loc.start){
			diagnostics.push({
				range: {
					start: {
						line: err.krl_compiler.loc.start.line - 1,
						character: err.krl_compiler.loc.start.column,
					},
					end: {
						line: err.krl_compiler.loc.start.line,
						character: 0
					}
				},
				message: err + "",
				severity: DiagnosticSeverity.Error
			});
		}else{
			diagnostics.push({
				range: {
					start:{line:0, character:0}, end:{line:0, character:0}
				},
				message: err + "",
				severity: DiagnosticSeverity.Error
			});
		}
	}
	// Below is example code for adding related information to the diagnostic
	// if (hasDiagnosticRelatedInformationCapability) {
	// 	diagnostic.relatedInformation = [
	// 		{
	// 			location: {
	// 				uri: textDocument.uri,
	// 				range: Object.assign({}, diagnostic.range)
	// 			},
	// 			message: 'Spelling matters'
	// 		},
	// 		{
	// 			location: {
	// 				uri: textDocument.uri,
	// 				range: Object.assign({}, diagnostic.range)
	// 			},
	// 			message: 'Particularly for names'
	// 		}
	// 	];
	// }
	// while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
	// 	problems++;
		
	// }

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function getCachedCompletionItems(textDocumentID: TextDocumentIdentifier): CompletionItem[] {
	let cache = documentCache.get(textDocumentID.uri);
	if (cache) {
		return cache.completionItems	
	}
	return []
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(completionParams: CompletionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		let context: CompletionContext | undefined = completionParams.context
		let textDocumentID: TextDocumentIdentifier = completionParams.textDocument
		// If a dot is the trigger, we want to return operators in our suggestions
		let dotPrecedes : boolean = false
		if (context) {
			let triggerKind: CompletionTriggerKind = context.triggerKind
			let triggerChar: string | undefined = context.triggerCharacter
			if (triggerKind == CompletionTriggerKind.TriggerCharacter && triggerChar == '.') {
				dotPrecedes = true
			}
		}


		return getCompletions(completionParams, dotPrecedes).concat(getCachedCompletionItems(textDocumentID))
		
		// [
		// 	{
		// 		label: 'TypeScript',
		// 		kind: CompletionItemKind.Text,
		// 		data: 1
		// 	}
		// ];
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
		if (!document) {
			return [];			
		}
		let cache = documentCache.get(document.uri)
		if (cache && cache.symbolInformation) {
			return cache.symbolInformation
		}
		return [];
	}
)


connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	let txtDocItem : TextDocumentItem = params.textDocument;
	let textDocument : TextDocument = TextDocument.create(txtDocItem.uri, txtDocItem.languageId, txtDocItem.version, txtDocItem.text)
	updateCache(textDocument)
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
