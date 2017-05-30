import * as Qs from "@ecmal/node/querystring";
import * as Fs from "@ecmal/node/fs";
import * as Crypto from "@ecmal/node/crypto";

import { Buffer } from "@ecmal/node/buffer";
import { GoogleApiBase, GoogleRequest } from "../base";
import { HttpClient } from "@ecmal/http/client";

import { LookupOptions, LookupResult } from "./types";
import { RunQueryOptions, RunQueryResult } from "./types";
import { AllocateIdsOptions, AllocateIdsResult } from "./types";
import { BeginTransactionOptions, BeginTransactionResult } from "./types";
import { CommitOptions, CommitResult } from "./types";
import { RollbackOptions } from "./types";

export class GoogleDatastore extends GoogleApiBase {
    public async allocateIds(options:AllocateIdsOptions):Promise<AllocateIdsResult>{
        return await this.call({
            method  : 'POST',
            host    : 'datastore.googleapis.com',
            path    : `/v1/projects/${options.params.projectId}:allocateIds`,
            body    : options.body
        });
    }
    public async beginTransaction(options:BeginTransactionOptions):Promise<BeginTransactionResult>{
        return await this.call({
            method  : 'POST',
            host    : 'datastore.googleapis.com',
            path    : `/v1/projects/${options.params.projectId}:beginTransaction`,
        });
    }
    public async commit(options:CommitOptions):Promise<CommitResult>{
        console.info(options);
        return await this.call({
            method  : 'POST',
            host    : 'datastore.googleapis.com',
            path    : `/v1/projects/${options.params.projectId}:commit`,
            body    : options.body
        });
    }
    public async lookup(options:LookupOptions):Promise<LookupResult>{
        return await this.call({
            method  : 'POST',
            host    : 'datastore.googleapis.com',
            path    : `/v1/projects/${options.params.projectId}:lookup`,
            body    : options.body
        });
    }
    public async rollback(options:RollbackOptions):Promise<void>{
        return await this.call({
            method  : 'POST',
            host    : 'datastore.googleapis.com',
            path    : `/v1/projects/${options.params.projectId}:rollback`,
            body    : options.body
        });
    }
    public async runQuery(options:RunQueryOptions):Promise<RunQueryResult>{
        return await this.call({
            method  : 'POST',
            host    : 'datastore.googleapis.com',
            path    : `/v1/projects/${options.params.projectId}:runQuery`,
            body    : options.body
        });
    }
    
}

