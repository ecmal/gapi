import * as Qs from "@ecmal/node/querystring";
import * as Fs from "@ecmal/node/fs";
import * as Crypto from "@ecmal/node/crypto";

import { Buffer } from "@ecmal/node/buffer";
import { GoogleApiBase, GoogleRequest } from "../base";
import { HttpClient } from "@ecmal/http/client";

export type GoogleLogParent = "PROJECT" | "ORGANIZATION" | "BILLING" | "FOLDER";
export type GoogleLogSeverity = "DEFAULT" | "DEBUG" | "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL" | "ALERT" | "EMERGENCY";

export interface LogEntryOperation {
    id:string;
    producer:string;
    first?:boolean;
    last?:boolean;
}
export interface LogHttpRequest {
   requestMethod?: string,
   requestUrl?: string,
   requestSize?: string,
   status?: number,
   responseSize?: string,
   userAgent?: string,
   remoteIp?: string,
   serverIp?: string,
   referer?: string,
   latency?: string,
   cacheLookup?: boolean,
   cacheHit?: boolean,
   cacheValidatedWithOriginServer?: boolean,
   cacheFillBytes?: string,
}

export interface LogEntry {
    insertId?       : string;
    timestamp?      : string;
    trace?          : string;
    severity?       : GoogleLogSeverity;
    operation?      : LogEntryOperation;
    sourceLocation? : any;
    labels?         : any;
    httpRequest?    : LogHttpRequest;
    jsonPayload?    : Dictionary<any> & {
        message?    : string;
    }
}

export class GoogleLog {
    readonly logging : GoogleLogging;
    readonly parentType : GoogleLogParent;
    readonly parentId : string;
    readonly logId : string;
    readonly logName : string;
    readonly labels : any;
    readonly resource : any;
    readonly entries : any[];
    private timer: any;
    private requests:any[];
    public entry:any;
    constructor(logging: GoogleLogging, parentType: GoogleLogParent, parentId: string, logId: string, resource: any, labels: any) {
        let logName = `${parentType}s/${parentId}/logs/${encodeURIComponent(logId)}`.toLowerCase()
        Object.defineProperties(this, {
            timer       : { value : null, writable: true },
            logging     : { value : logging },
            parentType  : { value : parentType },
            parentId    : { value : parentId },
            logId       : { value : logId },
            logName     : { value : logName },
            labels      : { value : labels },
            resource    : { value : resource },
            entries     : { value : [] }
        })
    }
    public log(message:string,severity:GoogleLogSeverity="DEFAULT",patch?:LogEntry):LogEntry{
        let entry = patch ||{
            severity,
            jsonPayload : {message}
        }
        Object.assign(entry,this.entry);
        entry.severity = severity;
        if(!entry.jsonPayload){
            entry.jsonPayload = {message}
        }
        entry.jsonPayload.message = message;
        entry.insertId = process.hrtime().join('');
        entry.timestamp = new Date().toISOString();
        this.entries.push(entry);
        this.commit();
        return entry;
    }
    public debug(message:string,entry?:LogEntry){
        this.log(message,"DEBUG",entry);
    }
    public info(message:string,entry?:LogEntry){
        this.log(message,"INFO",entry);
    }
    public notice(message:string,entry?:LogEntry){
        this.log(message,"NOTICE",entry);
    }
    public warning(message:string,entry?:LogEntry){
        this.log(message,"WARNING",entry);
    }
    public error(message:string,entry?:LogEntry){
        this.log(message,"ERROR",entry);
    }
    public critical(message:string,entry?:LogEntry){
        this.log(message,"CRITICAL",entry);
    }
    public alert(message:string,entry?:LogEntry){
        this.log(message,"ALERT",entry);
    }
    public emergency(message:string,entry?:LogEntry){
        this.log(message,"EMERGENCY",entry);
    }
    public commit(){
        let sendRequest = async () => {
            return await this.logging.writeEntries({
                partialSuccess  : true,
                labels          : this.labels,
                logName         : this.logName,
                resource        : this.resource,
                entries         : this.entries.splice(0)
            });
        }
        if (!this.timer) {
            this.timer = setTimeout(()=>{
                sendRequest().then(
                    () => {
                        clearTimeout(this.timer);
                        this.timer = null;
                        if(this.entries.length){
                            this.commit()
                        }
                    },
                    (e) => {
                        console.error(e.message);
                        console.error(JSON.stringify(e.details,null,2));
                        clearTimeout(this.timer);
                        this.timer = null;
                        if(this.entries.length){
                            this.commit()
                        }
                    }
                )
            },1)            
        }
    }
}

export class GoogleLogging extends GoogleApiBase {
    public async writeEntries(params:{
        logName         : string;
        resource        : any;
        partialSuccess? : boolean;
        labels?         : any;
        entries         : LogEntry[]
    }){
        return await this.call({
            method      : 'POST',
            host        : 'logging.googleapis.com',
            path        : '/v2/entries:write',
            body        : params
        });
    }
    async listProjectLogs(projectId?:string){
        projectId = projectId||this.options.project;
        let result = await this.call({
            method: 'GET',
            host: 'logging.googleapis.com',
            path: `/v2/projects/${projectId}/logs`,
        });
        return result.logNames.map(l => decodeURIComponent(l.split('/').pop()));
    }
    async deleteProjectLog(logId: string, projectId?: string) {
        projectId = projectId || this.options.project;
        let result = await this.call({
            method: 'DELETE',
            host: 'logging.googleapis.com',
            path: `/v2/projects/${projectId}/logs/${encodeURIComponent(logId)}`,
        });
        return result;
    }
    public getLog(type: GoogleLogParent, parentId: string, logId: string, resource: any, labels: any = {}): GoogleLog {
        return new GoogleLog(this, type, parentId, logId, resource, labels);
    }
    public getProjectLog(name: string='project', labels : {
        [k: string]: any;
        project_id? : string;
    }={}) {
        if(!labels.project_id){
            labels.project_id = this.options.project;
        }
        return this.getLog('PROJECT', labels.project_id, name, {
            type    : "project",
            labels  : labels
        }, labels);
    }

    getApiLog(){}
}

