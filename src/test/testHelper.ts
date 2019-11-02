import { TextDocument } from 'vscode-languageserver';
import { readdirSync, readFile, readFileSync } from 'fs';
import { isObject } from 'util';
import { resolve } from 'path';
import fileUrl = require('file-url');

let testFiles = new Map<string, TextDocument>()
console.log(__dirname)
try {
	let testFileNames = readdirSync(resolve(__dirname, './krlTestFiles'))
	testFileNames.forEach(testFileName => {
		let testFilePath = resolve(__dirname, 'krlTestFiles', testFileName)
		const fileContent = readFileSync(testFilePath, 'utf8')
		let fileURI = fileUrl(testFilePath)
		let document = TextDocument.create(fileURI, 'krl', 0, fileContent)
		testFiles.set(testFileName, document)
	});
} catch (e) {
	console.error('Unable to load test files')
	console.error(e)
}
export function getTestFiles() : Map<string, TextDocument> {
	return testFiles
}