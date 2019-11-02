import * as assert from 'assert';
import { getTestFiles } from './testHelper'
import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { getDiagnostics } from '../diagnostics';

const testFileMap = getTestFiles()

function getTestFile(fileName : string) : never | TextDocument {
	let document = testFileMap.get(fileName) 
	if (document == undefined) {
		return assert.fail("Failed to get test KRL document")
	}
	return document
}

describe('Should do error checking', () => {
	
	describe('Parse error should result in an error on the relevant line', () => {
		
		it('Should result in an error when a keyword is misspelled (always keyword)', () => {
			const parseErrorKeyword: TextDocument = getTestFile('parseErrorKeyword.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(parseErrorKeyword)
			assert.ok(diagnostics.length > 0)
			// Given the test file we should get an ERROR, on the line where always is misspelled
			const errorDiagnostic = diagnostics[0]
			assert.equal(errorDiagnostic.severity, DiagnosticSeverity.Error)
			// In the file always is misspelled on line 18 from a 0 index
			assert.equal(errorDiagnostic.range.start.line, 18)
		}); 
	});

	describe('Semantic error should result in an error emitted internally by the compiler on the relevant line', () => {
		
		it('should emit an error when a return value is not an expression', () => {
			const compileError: TextDocument = getTestFile('compileErrorFuncRet.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(compileError)
			assert.ok(diagnostics.length > 0)
			// Given the test file we should get an ERROR, on the line where the return value is invalid
			const errorDiagnostic = diagnostics[0]
			assert.equal(errorDiagnostic.severity, DiagnosticSeverity.Error)
			// In the file the return statement is on line 6
			assert.equal(errorDiagnostic.range.start.line, 6)
		}); 
	});


	describe('A warning diagnostic should be created when the compiler detects a semantic issue', () => {
		
		it('will result in a duplicate declaration diagnostic being emitted when the compiler detects one', () => {
			const compileWarningDoc: TextDocument = getTestFile('compileErrorDupDec.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(compileWarningDoc)
			assert.ok(diagnostics.length > 0)
			// Given the test file we should get a warning for a duplicate declaration
			const warningDiagnostic = diagnostics[0]
			assert.equal(warningDiagnostic.severity, DiagnosticSeverity.Warning)
			// The duplicate declaration is on line 15 in the file
			assert.equal(warningDiagnostic.range.start.line, 15)
		}); 
	});

	describe('A valid ruleset should result in no errors or warnings', () => {
		
		it('Should result in an empty Diagnostic array when the KRL ruleset is fine', () => {
			const parseErrorKeyword: TextDocument = getTestFile('hello.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(parseErrorKeyword)
			assert.ok(diagnostics.length == 0)
		}); 
	});
	
});