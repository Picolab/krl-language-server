// This module is main module to analyze a KRL source file and come up with meaningful results
import { SymbolInformation, CompletionItem, Diagnostic, TextDocument } from 'vscode-languageserver';
import krlParser from 'krl-parser';
import { documentSymbolsFromAst, documentSymbolsFromLexer } from './documentSymbol';
import { traverseAST } from './completion';
import { getDiagnostics } from './diagnostics';



export interface krlAnalysisResults {
	ast:any
	documentSymbols : SymbolInformation[],
	completionItems: CompletionItem[],
	diagnostics: Diagnostic[]
}

export namespace krlAnalysisResults {
	export function create(ast:any = null, 
						   symbolInfo : SymbolInformation[] = [], 
						   completionItems : CompletionItem[] = [], 
						   diagnostics : Diagnostic[] = []) : krlAnalysisResults {
		return {
			ast: ast,
			documentSymbols: symbolInfo,
			completionItems: completionItems,
			diagnostics: diagnostics
		}
	}
}

export function analyzeKRLDocument(krlDocument: TextDocument) : krlAnalysisResults {
	// Try and parse, if parse successful use that analysis to provide information
	// If parsing fails, fall back on lexer to provide information
	let krlSource = krlDocument.getText()
	let analysisResults: krlAnalysisResults = krlAnalysisResults.create()
	analysisResults.ast = undefined

	analysisResults.diagnostics = getDiagnostics(krlDocument)
	try {
		let newAst = krlParser(krlSource);
		analysisResults.documentSymbols = documentSymbolsFromAst(krlSource, newAst);
		analysisResults.completionItems = [...new Set(traverseAST(newAst))]
		analysisResults.ast = newAst
	} catch(e) {
		// Fall back on lexer
		// let tokens: any = tokenizer(krlSource)
		analysisResults.documentSymbols = documentSymbolsFromLexer(krlSource)
		// analysisResults.completionItems = completionItemsFromLexer(krlSource)
	}

	return analysisResults 

}
