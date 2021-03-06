import { CompletionItem, CompletionItemKind, TextDocumentPositionParams, Position, CompletionParams, InsertTextFormat, CompletionContext, TextDocumentIdentifier, CompletionTriggerKind } from 'vscode-languageserver';
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

export function getCompletions(completionParams : CompletionParams) : CompletionItem[] {
	
	let context: CompletionContext | undefined = completionParams.context
		// If a dot is the trigger, we want to return operators in our suggestions
		let dotPrecedes : boolean = false
		if (context) {
			let triggerKind: CompletionTriggerKind = context.triggerKind
			let triggerChar: string | undefined = context.triggerCharacter
			if (triggerKind == CompletionTriggerKind.TriggerCharacter && triggerChar == '.') {
				dotPrecedes = true
			}
		}
	
	// let cursorPos: Position = completionParams.position
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
		if (ast.type == 'Declaration' && ast.right.type == 'Function') {
			completions.push(makeFunctionItemFromFuncSig(ast.left.value))
			ast = ast.right
		} else {
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
		}
		for (let prop in ast) {
			completions = completions.concat(traverseAST(ast[prop], alreadyMadeLabels))
		}
	}
	return completions
}


function makeFunctionItemFromFuncSig(funcName: string, parameters?: string[]) {
	return	{
		'label': funcName,
		'detail': 'Function',
		'kind': CompletionItemKind.Function,
		'insertTextFormat': InsertTextFormat.PlainText,
		'insertText': funcName + '('
	}

}
function makeFunctionItemFromTok(token: any): CompletionItem {
	return	{
		'label': token.src,
		'detail': 'Function',
		'kind': CompletionItemKind.Function,
		'insertTextFormat': InsertTextFormat.PlainText,
		'insertText': token.src + '('
	}
}
function makeSymbolItem(tokenSrc: string): CompletionItem {
	return {
				'label': tokenSrc,
				'detail': "Symbol",
				'kind': CompletionItemKind.Text,
				'insertTextFormat': InsertTextFormat.PlainText,
				'insertText': tokenSrc 
			}
}

export function completionItemsFromLexer(tokens: Array<any>): CompletionItem[] {
	let completions: CompletionItem[] = []
	// We use a set to ensure unique symbols provided back to the editor
	let symbolSet: Set<string> = new Set()
	for (let i = 0; i < tokens.length; i++)  {
		let token = tokens[i]
		let nextToken = i + 1 >= completions.length ? tokens[i + 1] : undefined
		
		if (token.type == 'SYMBOL') {
			if (nextToken && nextToken.src == 'function') {
				completions.push(makeFunctionItemFromTok(token))
			} else {
				symbolSet.add(token.src)
			}
			
		}
	}
	completions = [...symbolSet].map((tokenSrc) => makeSymbolItem(tokenSrc))
	return completions 
}