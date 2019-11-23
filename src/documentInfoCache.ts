/*
 This module provides a cache to store extra information about a KRL document, such as its analysis results,
 so that the server can provide the information to the editor whenever it requests it.
*/
import { SymbolInformation, CompletionItem, TextDocument } from 'vscode-languageserver';
import { krlAnalysisResults } from './analyze';

type documentURI = string
let documentInfoCache: Map<documentURI, krlDocCacheEntry> = new Map();

interface krlDocCacheEntry {
	analysisResults: krlAnalysisResults 
}

namespace krlDocCacheEntry {
	export function create(analysisResults: krlAnalysisResults = krlAnalysisResults.create()) : krlDocCacheEntry {
		return {
			analysisResults
		}
	}
}

export function updateCachedAnalysis(krlDocument: TextDocument, analysis: krlAnalysisResults) {
	let cacheEntry: krlDocCacheEntry | undefined = documentInfoCache.get(krlDocument.uri);
	if (!cacheEntry) {
		cacheEntry = krlDocCacheEntry.create()
		documentInfoCache.set(krlDocument.uri, cacheEntry)
	}
	cacheEntry.analysisResults = analysis

}

export function getCachedAnalysis(krlDocument: TextDocument): krlAnalysisResults | undefined {
	let cacheEntry: krlDocCacheEntry | undefined = documentInfoCache.get(krlDocument.uri);
	if (!cacheEntry) {
		return undefined
	}
	return cacheEntry.analysisResults
}

export function deleteCacheEntry(krlDocument: TextDocument): boolean {
	return documentInfoCache.delete(krlDocument.uri)
}

