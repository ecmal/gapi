import * as Qs from "@ecmal/node/querystring";
import * as Fs from "@ecmal/node/fs";
import * as Crypto from "@ecmal/node/crypto";
import { cached } from "@ecmal/runtime/decorators";
import { Buffer } from "@ecmal/node/buffer";
import { GoogleApiBase, GoogleRequest } from "../base";
import { HttpClient } from "@ecmal/http/client";

import { Project, ProjectReference } from "./types";
import { Dataset, DatasetReference } from "./types";
import { Job, JobReference } from "./types";
import {
    JobConfiguration,
    CopyJobConfiguration,
    ExtractJobConfiguration,
    QueryJobConfiguration,
    LoadJobConfiguration,
} from "./types";
import { Table, TableReference } from "./types";
import {

    GetDatasetOptions, DeleteDatasetOptions,
    InsertDatasetOptions, UpdateDatasetOptions,
    GetJobOptions, InsertJobOptions,
    //
    GetRowsOptions, GetRowsResult,
    InsertRowsOptions, InsertRowsResult,
    //
    GetTableOptions, DeleteTableOptions,
    InsertTableOptions, UpdateTableOptions,

    // lists
    GetJobsOptions, GetJobsResult,
    GetTablesOptions, GetTablesResult,
    GetDatasetsOptions, GetDatasetsResult,
    GetProjectsOptions, GetProjectsResult,
} from "./types";


export class BigqueryEntity {
    readonly id: string;
    readonly api: GoogleBigquery;
    constructor(api: GoogleBigquery) {
        Object.defineProperty(this, 'api', { value: api })
    }
}
export class BigqueryTable extends BigqueryEntity implements Table {
    readonly dataset: BigqueryDataset;
    readonly tables: Dictionary<BigqueryTable>;
    readonly tableReference: TableReference;
    constructor(dataset: BigqueryDataset) {
        super(dataset.api);
        Object.defineProperty(this, 'dataset', { value: dataset })
    }
}
export class BigqueryDataset extends BigqueryEntity implements Dataset {
    readonly project: BigqueryProject;
    readonly tables: Dictionary<BigqueryTable>;
    readonly datasetReference: DatasetReference;
    constructor(project: BigqueryProject) {
        super(project.api);
        Object.defineProperty(this, 'project', { value: project })
    }
    async getTables(cached: boolean = true) {
        if (!this.tables || !cached) {
            if (this.tables) {
                Object.getOwnPropertyNames(this.tables).forEach(k => {
                    delete this.tables[k];
                })
            }
            let list = await this.api.resource.tables.list({
                params: this.datasetReference
            });
            Object.defineProperty(this, 'tables', {
                value: list.tables.reduce((tables, p) => {
                    Object.setPrototypeOf(p, BigqueryTable.prototype);
                    Object.defineProperty(tables, p.tableReference.tableId, {
                        value: BigqueryTable.call(p, this) || p
                    })
                    return tables;
                }, Object.create(null))
            })
        }
        return Object.getOwnPropertyNames(this.tables).map(k => this.tables[k]);
    }
    async getTable(id: string) {
        if (!this.tables) {
            await this.getTables();
        }
        return this.tables[id];
    }
}

export class BigqueryJob implements Job {
    readonly configuration: JobConfiguration;
    readonly project: BigqueryProject;
    constructor(project: BigqueryProject, config: JobConfiguration) {
        this.configuration = config;
        this.project = project;
    }
    public get query():any{return void 0}
    public get media():any{return void 0}
    async run(extra?:{media?:any,query?:any}): Promise<this> {
        let result = await this.project.api.resource.jobs.insert({
            params  : { projectId: this.project.id },
            query   : extra.query,
            media   : extra.media,
            body    : { configuration: this.configuration }
        })
        return this;
    }
}
export class BigqueryCopyJob extends BigqueryJob {
    configuration: JobConfiguration;
    constructor(project: BigqueryProject, config: CopyJobConfiguration) {
        super(project, { copy: config });
    }
}
export class BigqueryExtractJob extends BigqueryJob {
    configuration:JobConfiguration;
    constructor(project: BigqueryProject, config: ExtractJobConfiguration) {
        super(project, { extract: config });
    }
}

export class BigqueryLoadJob extends BigqueryJob {
    configuration: JobConfiguration;
    constructor(project: BigqueryProject, config: LoadJobConfiguration) {
        super(project, { load: config });
    }
    async run(data?:any){
        if(Array.isArray(data)){
            data = {
                contentType: '*/*',
                contentBody: data.map(e=>JSON.stringify(e)).join('\n') + '\n'
            }
        }else{
            data = {
                contentType: '*/*',
                contentBody: data
            }
        }
        Fs.writeFileSync('./test-data.json',data.contentBody)
        return super.run({
            media : data,
            query : { uploadType: 'multipart' }
        });
    }
}
export class BigqueryQueryJob extends BigqueryJob {
    constructor(project: BigqueryProject, config: QueryJobConfiguration) {
        super(project, { query: config });
    }
}

export class BigqueryProject extends BigqueryEntity implements Project {
    readonly datasets: Dictionary<BigqueryDataset>;
    async getDatasets(cached: boolean = true) {
        if (!this.datasets || !cached) {
            if (this.datasets) {
                Object.getOwnPropertyNames(this.datasets).forEach(k => {
                    delete this.datasets[k];
                })
            }
            let list = await this.api.resource.datasets.list({
                params: { projectId: this.id }
            });
            Object.defineProperty(this, 'datasets', {
                value: list.datasets.reduce((datasets, p) => {
                    Object.setPrototypeOf(p, BigqueryDataset.prototype);
                    Object.defineProperty(datasets, p.datasetReference.datasetId, {
                        value: BigqueryDataset.call(p, this) || p
                    })
                    return datasets;
                }, Object.create(null))
            })
        }
        return Object.getOwnPropertyNames(this.datasets).map(k => this.datasets[k]);
    }
    async getDataset(id: string) {
        if (!this.datasets) {
            await this.getDatasets();
        }
        return this.datasets[id];
    }
    async runLoadJob(data:string|any[],config: LoadJobConfiguration): Promise<BigqueryLoadJob> {
        return new BigqueryLoadJob(this, config).run(data);
    }
}

export class GoogleBigquery extends GoogleApiBase {
    @cached
    public get resource() {
        return {
            projects: {
                list: async (options: GetProjectsOptions): Promise<GetProjectsResult> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects`
                    });
                }
            },
            datasets: {
                list: async (options: GetDatasetsOptions): Promise<GetDatasetsResult> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets`
                    });
                },
                get: async (options: GetDatasetOptions): Promise<Dataset> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}`
                    });
                },
                insert: async (options: InsertDatasetOptions): Promise<Dataset> => {
                    return await this.call({
                        method: 'POST',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets`,
                        body: options.body
                    });
                },
                update: async (options: UpdateDatasetOptions): Promise<Dataset> => {
                    return await this.call({
                        method: 'PUT',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}`
                    });
                },
                patch: async (options: UpdateDatasetOptions): Promise<Dataset> => {
                    return await this.call({
                        method: 'PATCH',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}`
                    });
                },
                delete: async (options: DeleteDatasetOptions): Promise<void> => {
                    return await this.call({
                        method: 'DELETE',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}`
                    });
                }
            },
            jobs: {
                list: async (options: GetJobsOptions): Promise<GetJobsResult> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/jobs`
                    });
                },
                get: async (options: GetJobOptions): Promise<Job> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/jobs/${options.params.jobId}`
                    });
                },
                insert: async (options: InsertJobOptions): Promise<Job> => {
                    let path = `/bigquery/v2/projects/${options.params.projectId}/jobs`
                    if (options.query && options.query.uploadType) {
                        path = `/upload/bigquery/v2/projects/${options.params.projectId}/jobs`
                    }
                    return await this.call({
                        method: 'POST',
                        host: 'www.googleapis.com',
                        query: options.query,
                        path: path,
                        body: options.body,
                        media: options.media
                    });
                }
            },
            tables: {
                list: async (options: GetTablesOptions): Promise<GetTablesResult> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables`
                    });
                },
                get: async (options: GetTableOptions): Promise<Table> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables/${options.params.tableId}`
                    });
                },
                insert: async (options: InsertTableOptions): Promise<Table> => {
                    return await this.call({
                        method: 'POST',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables`,
                        body: options.body
                    });
                },
                update: async (options: UpdateTableOptions): Promise<Table> => {
                    return await this.call({
                        method: 'PUT',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables/${options.params.tableId}`
                    });
                },
                patch: async (options: UpdateTableOptions): Promise<Table> => {
                    return await this.call({
                        method: 'PATCH',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables/${options.params.tableId}`
                    });
                },
                delete: async (options: DeleteTableOptions): Promise<void> => {
                    return await this.call({
                        method: 'DELETE',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables/${options.params.tableId}`
                    });
                }
            },
            tabledata: {
                insertAll: async (options: InsertRowsOptions): Promise<InsertRowsResult> => {
                    return await this.call({
                        method: 'POST',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables/${options.params.tableId}/data`
                    });
                },
                list: async (options: GetRowsOptions): Promise<GetRowsResult> => {
                    return await this.call({
                        method: 'GET',
                        host: 'www.googleapis.com',
                        path: `/bigquery/v2/projects/${options.params.projectId}/datasets/${options.params.datasetId}/tables/${options.params.tableId}/insertAll`
                    });
                }
            }
        }
    }
    readonly projects: Dictionary<BigqueryProject>;
    async getProjects(cached: boolean = true) {
        if (!this.projects || !cached) {
            if (this.projects) {
                Object.getOwnPropertyNames(this.projects).forEach(k => {
                    delete this.projects[k];
                })
            }
            let list = await this.resource.projects.list({});
            Object.defineProperty(this, 'projects', {
                value: list.projects.reduce((projects, p) => {
                    Object.setPrototypeOf(p, BigqueryProject.prototype);
                    Object.defineProperty(projects, p.id, {
                        value: BigqueryProject.call(p, this) || p
                    })
                    return projects;
                }, Object.create(null))
            })
        }
        return Object.getOwnPropertyNames(this.projects).map(k => this.projects[k]);
    }
    async getProject(id: string) {
        if (!this.projects) {
            await this.getProjects();
        }
        return this.projects[id];
    }
}

