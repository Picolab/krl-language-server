import { TextDocument } from 'vscode-languageserver';
import { readdirSync } from 'fs';

let testFiles = new Map<string, TextDocument>()

try {
	let testFileNames = readdirSync('./krlTestFiles')
} catch (e) {
	console.error('Unable to load test files')
	console.error(e)
}
export function getTestFiles() : Map<string, TextDocument> {
	return testFiles
}