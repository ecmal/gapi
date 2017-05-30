import * as Qs from "@ecmal/node/querystring";
import * as Fs from "@ecmal/node/fs";
import * as Crypto from "@ecmal/node/crypto";

import { cached } from "@ecmal/runtime/decorators";
import { inject } from "@ecmal/runtime/decorators";
import { Emitter } from "@ecmal/runtime/events";
import { Signal } from "@ecmal/runtime/events";
import { Buffer } from "@ecmal/node/buffer";
import { GoogleApiBase, GoogleRequest } from "../base";
import { HttpClient } from "@ecmal/http/client";
export type SpanKind = "RPC_SERVER" | "RPC_CLIENT";

export interface Span {
    spanId: number,
    kind: SpanKind,
    name: string,
    startTime: string,
    endTime: string,
    parentSpanId: number,
    labels: MapLike<string>,
}

export interface Trace {
    projectId: string;
    traceId: string;
    spans: Span[]
}

export interface Traces {
    traces: Trace[],
}
export class GoogleSpan implements Span {
    public startTime: string;
    public endTime: string;
    constructor(
        protected trace: GoogleTrace,
        readonly spanId: number,
        readonly parentSpanId: number,
        readonly name: string,
        readonly kind: SpanKind,
        readonly labels: MapLike<string> = {}

    ) {
        this.startTime = new Date().toISOString();
        this.endTime = null;
    }
    set(labels: MapLike<string>): this {
        Object.assign(this.labels, labels);
        return this;
    }
    end() {
        this.endTime = new Date().toISOString();
    }
    toJSON(): Span {
        return {
            spanId: this.spanId,
            kind: this.kind,
            name: this.name,
            startTime: this.startTime,
            endTime: this.endTime,
            parentSpanId: this.parentSpanId,
            labels: this.labels
        }
    }
    public child(name: string, kind?: SpanKind): GoogleSpan {
        return this.trace.span(name,this,kind);
    }
}
export class GoogleTrace implements Trace {
    public projectId: string;
    public root: GoogleSpan;
    public spans: Span[];
    constructor(
        protected api: GoogleTracer,
        public traceId: string,
        private next: number = 0,
        private name: string = 'empty',
    ) {
        this.projectId = this.api.projectId;
        this.root = new GoogleSpan(this, this.next++, void 0, name, this.api.kind)
        this.spans = [this.root];
        this.api.traces.set(this.traceId, this);
    }

    public span(name: string, parent?: Span, kind?: SpanKind): GoogleSpan {
        kind = kind || (parent ? parent.kind : this.api.kind)
        parent = parent || this.root;
        let span = new GoogleSpan(this, this.next++, parent.spanId, name, kind);
        this.spans.push(span)
        return span;
    }
    public set(labels: MapLike<string>): this {
        this.root.set(labels);
        return this;
    }
    public done(labels?: MapLike<string>) {
        this.api.traces.delete(this.traceId);
        this.api.queue.add(this);
        this.set(labels);
        this.root.end();
    }
    toJSON(): Trace {
        return {
            projectId: this.projectId,
            traceId: this.traceId,
            spans: this.spans
        }
    }
}

export class GoogleTracing extends GoogleApiBase {
    @cached
    public get resource() {
        return {
            patch: async (options: {
                params: { projectId: string },
                body: Traces
            }): Promise<any> => {
                return await this.call({
                    method: 'PATCH',
                    host: 'cloudtrace.googleapis.com',
                    path: `/v1/projects/${options.params.projectId}/traces`,
                    body: options.body
                });
            },
            list: async (options: {
                params: { projectId: string },
                query: {
                    view: "MINIMAL" | "ROOTSPAN" | "COMPLETE"
                    pageSize: number;
                    pageToken: number;
                    startTime: number;
                    endTime: number;
                    filter: string;
                    orderBy: string;
                }
            }): Promise<any> => {
                return await this.call({
                    method: 'GET',
                    host: 'cloudtrace.googleapis.com',
                    path: `/v1/projects/${options.params.projectId}/traces`,
                    query: options.query
                });
            },
            get: async (options: {
                params: {
                    projectId: string;
                    traceId: string;
                }
            }): Promise<any> => {
                return await this.call({
                    method: 'GET',
                    host: 'cloudtrace.googleapis.com',
                    path: `/v1/projects/${options.params.projectId}/traces/${options.params.traceId}`
                });
            }
        }
    }
    public getTracer(kind: SpanKind = "RPC_CLIENT", projectId?: string) {
        if (!projectId) {
            projectId = this.options.project;
        }
        return new GoogleTracer(this, projectId, kind)
    }
}

export class GoogleTracer {
    private timer: any;
    constructor(
        private api: GoogleTracing,
        readonly projectId: string,
        readonly kind: SpanKind,
    ) {
        this.start();
    }
    start() {
        if (!this.timer) {
            let oldResult = ''; 
            this.timer = setInterval(()=>{
                let newResult = this.commit();
                if(oldResult!=newResult){
                    console.info(oldResult = newResult)
                }
            }, 1000);
        }
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    commit() {
        let result = `COMMIT : ${this.traces.size} / ${this.queue.size}`;
        let data = []
        if (this.queue.size) {
            this.queue.forEach(e => {
                data.push(e);                
            })
            this.queue.clear();
            this.api.resource.patch({
                params : {projectId:this.projectId },
                body: { traces: data }
            }).then(
                r=>console.info(r),
                e=>console.error(e)
            )
        }
        return result;
    }

    @cached
    public get queue(): Set<GoogleTrace> {
        return new Set();
    }

    @cached
    public get traces(): Map<string, GoogleTrace> {
        return new Map();
    }

    public trace(name: string, id?: string): GoogleTrace {
        if (!id) {
            id = Crypto.createHash('md5').update(process.hrtime().join('')).digest('hex');
        }
        let traceId = id, spanId = 1;
        if (id.length > 32 && id[32] == '/') {
            traceId = id.substring(0, 32)
            spanId = parseInt(id.substring(33))
        }
        if (this.traces.has(traceId)) {
            return this.traces.get(traceId);
        } else {
            return new GoogleTrace(this, traceId, spanId, name);
        }
    }

}