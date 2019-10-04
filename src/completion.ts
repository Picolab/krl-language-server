import { CompletionItem, CompletionItemKind, TextDocumentPositionParams, Position, CompletionParams, InsertTextFormat } from 'vscode-languageserver';
import { isObject } from 'util';

// Add descriptions later
const krlArrayOps = [
	'all',
	'any',
	'append',
	'collect',
	'filter',
	'head',
	'index',
	'join',
	'length',
	'map',
	'none',
	'notall',
	'pairwise',
	'reduce',
	'reverse',
	'slice',
	'splice',
	'sort',
	'tail'
]

const krlStringOps = [
	'capitalize',
	'decode',
	'extract',
	'lc',
	'length',
	'match',
	'ord',
	'replace',
	'split',
	'sprintf',
	'substr',
	'uc'
]

const krlNumberOps = [
	'chr',
	'range',
	'sprintf'
]

const universalOps = [
	'as',
	'defaultsTo',
	'encode',
	'isnull',
	'klog',
	'typeof'
]

const mapOps = [
	'get',
	'delete',
	'filter',
	'keys',
	'length',
	'map',
	'put',
	'set',
	'values'
]

const setOps = [
	'intersection',
	'union',
	'difference',
	'has',
	'once',
	'duplicates',
	'unique'
]

const krlOperators = setOps
						.concat(mapOps)
						.concat(universalOps)
						.concat(krlNumberOps)
						.concat(krlStringOps)
						.concat(krlArrayOps)

const krlOperatorsSet: Set<string> = new Set(krlOperators)

function funcNamestoCompletionItems(funcNames : string[]) : CompletionItem[] {
	let compItems: CompletionItem[] = []
	funcNames.forEach(funcName => {
		compItems.push(
			// {
			// 	label: funcName,
			// 	detail: 'function',
			// 	kind: CompletionItemKind.Function,
			// 	insertTextFormat: InsertTextFormat.Snippet,
			// 	insertText: funcName + '(${1:params}$0)'
			// },
			{
				label: funcName,
				detail: 'function',
				kind: CompletionItemKind.Function,
				insertTextFormat: InsertTextFormat.PlainText,
				insertText: funcName + '('
			}
		)
	});
	return compItems
}



const krlOpsSuggestions = funcNamestoCompletionItems(krlOperators)

const krlStructureSuggestions : CompletionItem[] = [
	// {
	// 	label: 'function(',
	// 	detail: 'Anonymous Function',
	// 	kind: CompletionItemKind.Method,
	// 	preselect: true,
	// 	insertTextFormat: InsertTextFormat.Snippet,
	// 	insertText: 'function(${1:params}) {$0'
	// }
	{
		label: 'function(',
		detail: 'Anonymous Function',
		kind: CompletionItemKind.Method,
		preselect: true,
		insertTextFormat: InsertTextFormat.PlainText,
		insertText: 'function('
	}
]

export function getCompletions(completionParams : CompletionParams, dotPrecedes : Boolean) : CompletionItem[] {
	let cursorPos: Position = completionParams.position
	let suggestions: CompletionItem[] = []
	suggestions = suggestions.concat(krlStructureSuggestions)
	if (dotPrecedes) {
		return krlOpsSuggestions
	}
	
	return suggestions
}

export function traverseAST(ast: any, alreadyMadeLabels: Set<string> = new Set(krlOperatorsSet)) : CompletionItem[] {
	let completions: CompletionItem[] = []
	if (Array.isArray(ast)) {
		return ast.map(function(element) {
			return traverseAST(element, alreadyMadeLabels)
		}).reduce(function(arr, arr2) {
			return arr.concat(arr2)
		}, [])
	}
	if (ast && isObject(ast) && ast.type) {
		if (ast.type == 'Identifier') {
			if (!alreadyMadeLabels.has(ast.value))  {
				completions.push(
					{
						label: ast.value,
						detail: 'Identifier',
						kind: CompletionItemKind.Reference
					}
				)
				alreadyMadeLabels.add(ast.value)
			}
		}
		for (let prop in ast) {
			completions = completions.concat(traverseAST(ast[prop], alreadyMadeLabels))
		}
	}
	return completions
}

