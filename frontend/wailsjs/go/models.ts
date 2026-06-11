export namespace models {
	
	export class AppSettings {
	    vaultRoot: string;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.vaultRoot = source["vaultRoot"];
	    }
	}
	export class ChangeSummary {
	    modified: number;
	    added: number;
	    deleted: number;
	
	    static createFrom(source: any = {}) {
	        return new ChangeSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.modified = source["modified"];
	        this.added = source["added"];
	        this.deleted = source["deleted"];
	    }
	}
	export class Project {
	    id: string;
	    name: string;
	    rootPath: string;
	    ignoreRules: string[];
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.rootPath = source["rootPath"];
	        this.ignoreRules = source["ignoreRules"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RestorePreview {
	    snapshotId: string;
	    snapshotName: string;
	    // Go type: time
	    createdAt: any;
	    sizeBytes: number;
	    filesToRestore: number;
	    filesToDelete: number;
	    preservedDirs: string[];
	    changeSummary: ChangeSummary;
	
	    static createFrom(source: any = {}) {
	        return new RestorePreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.snapshotId = source["snapshotId"];
	        this.snapshotName = source["snapshotName"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.sizeBytes = source["sizeBytes"];
	        this.filesToRestore = source["filesToRestore"];
	        this.filesToDelete = source["filesToDelete"];
	        this.preservedDirs = source["preservedDirs"];
	        this.changeSummary = this.convertValues(source["changeSummary"], ChangeSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Snapshot {
	    id: string;
	    projectId: string;
	    name: string;
	    notes: string;
	    sizeBytes: number;
	    fileCount: number;
	    folderCount: number;
	    isPinned: boolean;
	    storagePath: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Snapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.projectId = source["projectId"];
	        this.name = source["name"];
	        this.notes = source["notes"];
	        this.sizeBytes = source["sizeBytes"];
	        this.fileCount = source["fileCount"];
	        this.folderCount = source["folderCount"];
	        this.isPinned = source["isPinned"];
	        this.storagePath = source["storagePath"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SnapshotEntry {
	    id: string;
	    snapshotId: string;
	    relativePath: string;
	    sizeBytes: number;
	    changeType: string;
	    isDir: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SnapshotEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.snapshotId = source["snapshotId"];
	        this.relativePath = source["relativePath"];
	        this.sizeBytes = source["sizeBytes"];
	        this.changeType = source["changeType"];
	        this.isDir = source["isDir"];
	    }
	}

}

