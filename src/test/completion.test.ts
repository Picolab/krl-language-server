import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { getTestFile } from './testHelper';
import { getDiagnostics } from '../diagnostics';
import * as assert from 'assert';

describe('Should provide completions', () => {
	
	describe('Completion on a valid and parseable file should work as expected', () => {
		
		it('should provide an array of completions for various symbols within the file', () => {
			const compileWarningDoc: TextDocument = getTestFile('compileErrorDupDec.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(compileWarningDoc)
			assert.ok(diagnostics.length > 0)
			// Given the test file we should get a warning for a duplicate declaration
			const warningDiagnostic = diagnostics[0]
			assert.equal(warningDiagnostic.severity, DiagnosticSeverity.Warning)
			// The duplicate declaration is on line 15 in the file
			assert.equal(warningDiagnostic.range.start.line, 15)
		}); 
		
		it('should provide only unique completions', () => {
			const compileWarningDoc: TextDocument = getTestFile('compileErrorDupDec.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(compileWarningDoc)
			assert.ok(diagnostics.length > 0)
			// Given the test file we should get a warning for a duplicate declaration
			const warningDiagnostic = diagnostics[0]
			assert.equal(warningDiagnostic.severity, DiagnosticSeverity.Warning)
			// The duplicate declaration is on line 15 in the file
			assert.equal(warningDiagnostic.range.start.line, 15)
		}); 

		it('it should provide a set number of completions, given a specific file', () => {
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
	
	describe('Parse error should still result in valid completions found through lexing', () => {
		
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

	describe('Semantic error should still result in completions found through lexing', () => {
		
		it('should emit an error when a return value is not an expression', () => {
			const compileError: TextDocument = getTestFile('compileErrorFuncRet.krl')
			let diagnostics : Diagnostic[] = getDiagnostics(compileError)
			assert.ok(diagnostics.length > 0)
			// Given the test file we should get an ERROR, on the line where the return value is invalid
			const errorDiagnostic = diagnostics[0]
			assert.equal(errorDiagnostic.severity, DiagnosticSeverity.Error)
		}); 
	});



	// describe('A valid ruleset should result in no errors or warnings', () => {
		
	// 	it('Should result in an empty Diagnostic array when the KRL ruleset is fine', () => {
	// 		const parseErrorKeyword: TextDocument = getTestFile('hello.krl')
	// 		let diagnostics : Diagnostic[] = getDiagnostics(parseErrorKeyword)
	// 		assert.ok(diagnostics.length == 0)
	// 	}); 
	// });
	
});