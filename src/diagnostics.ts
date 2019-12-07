import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import krlCompiler from 'krl-compiler';
import krlParser from 'krl-parser';

export function getDiagnostics(krlDocument : TextDocument) : Diagnostic[] {
	let text = krlDocument.getText();
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
	return diagnostics
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

