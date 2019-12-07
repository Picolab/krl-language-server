import { SymbolInformation, TextDocumentIdentifier, TextDocument, SymbolKind, Range, Position } from 'vscode-languageserver'
import lineColumn from 'line-column';

let KRLTypesToSymbols: Map<string, SymbolKind> = new Map([
	['RulesetID', SymbolKind.Namespace],
	['meta', SymbolKind.Namespace],
	['global', SymbolKind.Namespace],
	['Map', SymbolKind.Object],
	['Function', SymbolKind.Function],
	['Identifier', SymbolKind.Variable],
	['DefAction', SymbolKind.Method],
	['RulesetMetaProperty', SymbolKind.Field],
	['String', SymbolKind.String],
	['Number', SymbolKind.Number],
	['Array', SymbolKind.Array],
	['Rule', SymbolKind.Event]
])

export function documentSymbolsFromLexer(krlSource : string): SymbolInformation[] {
	return []
}

export function documentSymbolsFromAst(krlSource: string, ast:any): SymbolInformation[] {
	let symbols: SymbolInformation[] = [];
	symbols = flattenKrlAstIntoSymbols(ast, krlSource)
	return symbols;
}
/**A helper function to generalize creating symbols.
 * 
 * @param symbolName Name of the symbol
 * @param symbolKind KRL type of the symbol, uses the KRLTypesToSymbols map to map to symbol kind
 * @param symbolParent The parent of the symbol -> This parent param is used for informative purposes only: it doesn't help form a tree. 
 * @param startLine The line that the symbol scope starts on
 * @param endLine The line that the symbol scope ends on
 */
function createSymbol(symbolName: string, symbolKind: string, symbolParent: string | undefined, startLine: number, endLine: number): SymbolInformation {
	return SymbolInformation.create(symbolName, 
									<SymbolKind> KRLTypesToSymbols.get(symbolKind) || SymbolKind.Null, 
									Range.create(Position.create(startLine - 1, 0), Position.create(endLine - 1, 0)), 
									undefined, 
									symbolParent)
}


function flattenKrlAstIntoSymbols(ast: any, src: String): SymbolInformation[] {
	let symbols: SymbolInformation[] = []
	let rid = ast['rid']
	let ridName: string = 'No RID Found'
	let meta = ast['meta']
	let global = ast['global']
	let rules = ast['rules']
	
	if (rid) {
		ridName = rid.value
		let start = lineColumn(src, rid.loc.start)
		let end = lineColumn(src, src.length - 1)
		symbols.push(createSymbol(ridName, rid.type, undefined, start.line, end.line))
	}
	if (meta) {
		let start = lineColumn(src, meta.loc.start)
		let end = lineColumn(src, meta.loc.end)
		symbols.push(createSymbol('meta', 'meta', ridName, start.line, end.line)) 
		for (let prop of meta.properties) {
			if (prop.type === 'RulesetMetaProperty') {
				let start = lineColumn(src, prop.key.loc.start)
				let end = lineColumn(src, prop.key.loc.end)
				symbols.push(createSymbol(prop.key.value, 'RulesetMetaProperty', 'meta', start.line, end.line))
			}
		}
	}
	if (global) {
		// Parser doesn't give loc of global block, so grab beginning of first tok and end of last tok
		if (global.length > 0) {
			let start = lineColumn(src, global[0].loc.start)
			let end = lineColumn(src, global[global.length - 1].loc.end)
			symbols.push(createSymbol('global', 'global', ridName, start.line, end.line))
		}
		for (let prop of global) {
			if (prop.type === 'Declaration') {
				let start = lineColumn(src, prop.loc.start)
				let end = lineColumn(src, prop.loc.end)
				let declValueType = prop.right.type
				let declIdentifier = prop.left.value
				symbols.push(createSymbol(declIdentifier, declValueType, 'global', start.line, end.line))
			}
			if (prop.type === 'DefAction') {
				let start = lineColumn(src, prop.loc.start)
				let end = lineColumn(src, prop.loc.end)
				let defActionIdentifier = prop.id.value
				symbols.push(createSymbol(defActionIdentifier, 'DefAction', 'global', start.line, end.line))
			}
		}
	}
	if (rules) {
		for (let rule of rules) {
			let start = lineColumn(src, rule.loc.start)
			let end = lineColumn(src, rule.loc.end)
			let ruleName = rule.name.value
			symbols.push(createSymbol(ruleName, 'Rule', ridName, start.line, end.line))
		}
	}
	
	
	return symbols;
}