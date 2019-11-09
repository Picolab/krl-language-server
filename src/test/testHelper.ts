import { TextDocument } from 'vscode-languageserver';
import { readdirSync, readFile, readFileSync } from 'fs';
import { isObject } from 'util';
import { resolve } from 'path';
import fileUrl = require('file-url');
import * as assert from 'assert';

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

export function getTestFile(fileName : string) : never | TextDocument {
	let document = getTestFiles().get(fileName) 
	if (document == undefined) {
		return assert.fail("Failed to get test KRL document")
	}
	return document
}