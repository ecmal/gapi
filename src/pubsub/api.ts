import * as Qs from "@ecmal/node/querystring";
import * as Fs from "@ecmal/node/fs";
import * as Crypto from "@ecmal/node/crypto";

import { cached } from "@ecmal/runtime/decorators";
import { inject } from "@ecmal/runtime/decorators";
import { Emitter } from "@ecmal/runtime/events";
import { Buffer } from "@ecmal/node/buffer";
import { GoogleApiBase, GoogleRequest } from "../base";
import { HttpClient } from "@ecmal/http/client";

export interface Topic {
    name: string;
    projectId: string,
    topicId: string
}
export interface Message {
    data: any,
    attributes?: Dictionary<string>,
    messageId?: string,
    ackId?: string,
    publishTime?: string,
}
export interface PushConfig {
    pushEndpoint: string;
    attributes: Dictionary<string>;
}
export interface Subscription {
    name?: string;
    topic?: string;
    pushConfig?: PushConfig;
    ackDeadlineSeconds?: number;
    subscriptionId?: string;
}

export class PubsubEntity {
    readonly name: string;
    readonly projectId: string;
    readonly api: GooglePubsub;
    constructor(api: GooglePubsub) {
        Object.defineProperty(this, 'api', {
            value: api
        })
    }
}
export class PubsubMessage implements Message {
    data: Buffer;
    attributes: Dictionary<string>;
    messageId: string;
    ackId: string;
    publishTime: string;
    protected subscription: Subscription;
    constructor(subscription: PubsubSubscription, options: Message) {
        options.data = Buffer.from(String(options.data),'base64');
        Object.defineProperty(this, 'subscription', {
            value: subscription
        })
        Object.assign(this, options)
        Object.freeze(this);
    }
    accept() { 

    }
    done(){ 

    }
}
export class PubsubSubscription extends PubsubEntity implements Subscription {
    readonly topic: string;
    readonly subscriptionId: string;
    readonly pushConfig: PushConfig;
    readonly ackDeadlineSeconds: number;

    protected handler:(message:PubsubMessage)=>Promise<any>
    protected timer: any;
    constructor(api: GooglePubsub, handler:(message:PubsubMessage)=>Promise<any>,options: Topic) {
        super(api);
        Object.defineProperty(this,'handler',{
            value:handler
        })
        Object.assign(this, options)
        Object.freeze(this);
        this.poll().catch(ex=>{
            console.info(ex);
        });
    }
    protected async poll() {
        let params = {
            projectId: this.projectId,
            subscriptionId: this.subscriptionId
        }
        let status = {}; 
        let commit = async (sec) => {
            let statuses = {
                complete : [],
                failed   : []
            }
            for(var i in status){
                let ackId = status[i];
                if(ackId=='failed' || ackId=='complete'){
                    statuses[ackId].push(i);
                    delete status[i];
                }
            }
            if(statuses.complete.length){
                await this.api.resource.subscriptions.acknowledge({
                    params: params,
                    body: {ackIds:statuses.complete}
                })
            }
            if(statuses.failed.length){
                await this.api.resource.subscriptions.modifyAckDeadline({
                    params: params,
                    body: {ackIds:statuses.failed,ackDeadlineSeconds:0}
                })
            }           
        }
        let wait = async (sec) => {
            return new Promise(accept=>setTimeout(accept,sec))
        }
        let request = async () => {
            console.info("POLL");
            let result = await this.api.resource.subscriptions.pull({
                params: params,
                body: {
                    maxMessages: 1,
                    returnImmediately: false
                }
            })
            if(result.receivedMessages){
                let promises = result.receivedMessages.map(item => {
                    status[item.ackId] = 'pending';
                    try{
                        let message = new PubsubMessage(this,item.message);
                        return this.handler(message).then(
                            r=>(status[item.ackId] = 'complete'),
                            e=>(status[item.ackId] = 'failed')
                        )
                    }catch(ex){
                        console.info("AAAAAAA",ex)
                        status[item.ackId] = 'failed'
                    }
                    
                })
                await commit(await Promise.all(promises))
            }            
        }
        while(true){
            await request();
            await wait(1000);
        }
    }
}

export class PubsubTopic extends PubsubEntity implements Topic {
    readonly topicId: string;
    constructor(api: GooglePubsub, options: Topic) {
        super(api);
        Object.assign(this, options)
        Object.freeze(this);
    }
    async publish(messages:Message[]){
        messages.forEach(m=>{
            if(!m.attributes){
                m.attributes = {};
            }
            if(!Buffer.isBuffer(m.data)){
                if(typeof m.data=='object'){
                    m.data = Buffer.from(JSON.stringify(m.data),'utf8')
                    m.attributes['content-type']='application/json'
                } else
                if(typeof m.data=='string'){
                   m.data = Buffer.from(JSON.stringify(m.data),'utf8')
                   m.attributes['content-type']='plain/text'
                }else{
                    m.data = Buffer.from(JSON.stringify({}),'utf8')
                    m.attributes['content-type']='application/json'
                }
            }else{
                 m.attributes['content-type']='application/json'
            }
            m.data = m.data.toString('base64');
        });
        return this.api.resource.topics.publish({
            params : { projectId:this.projectId, topicId:this.topicId },
            body   : {messages}
        })
    }
    public async subscribe(name: string, handler:(message:PubsubMessage)=>Promise<any>, subscription?: Subscription) {
        subscription = Object.assign({ topic: this.name }, subscription);
        let result, params = {
            subscriptionId: name,
            projectId: this.projectId,
        };
        try {
            result = await this.api.resource.subscriptions.create({
                params, body:subscription
            });
        } catch (ex) {
            if (ex.code == 409) {
                result = await this.api.resource.subscriptions.get({params});
            } else {
                throw ex;
            }
        }
        return new PubsubSubscription(this.api,handler,Object.assign(params,result))
    }
}

export class GooglePubsub extends GoogleApiBase {
    @cached
    public get resource() {
        return {
            subscriptions: {
                create: async (options: { params: { subscriptionId: string, projectId: string }, body: Subscription }): Promise<any> => {
                    return await this.call({
                        method: 'PUT',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/subscriptions/${options.params.subscriptionId}`,
                        body: options.body
                    });
                },
                get: async (options: { params: { subscriptionId: string, projectId: string } }): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/subscriptions/${options.params.subscriptionId}`
                    });
                },
                list: async (options: { params: { projectId: string } }): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/subscriptions`
                    });
                },
                pull: async (options: {
                    params: {
                        subscriptionId: string;
                        projectId: string;
                    }
                    body: {
                        returnImmediately: boolean;
                        maxMessages: number;
                    }
                }): Promise<any> => {
                    return await this.call({
                        method: 'POST',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/subscriptions/${options.params.subscriptionId}:pull`,
                        body: options.body
                    });
                },
                acknowledge: async (options: {
                    params: {
                        subscriptionId: string;
                        projectId: string;
                    }
                    body: {
                        ackIds: string[],
                    }
                }): Promise<any> => {
                    return await this.call({
                        method: 'POST',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/subscriptions/${options.params.subscriptionId}:acknowledge`,
                        body: options.body
                    });
                },
                modifyPushConfig: async (options: {
                    params: {
                        subscriptionId: string;
                        projectId: string;
                    }
                    body: {
                        pushConfig: PushConfig,
                    }
                }): Promise<any> => {
                    return await this.call({
                        method: 'POST',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/topics/${options.params.subscriptionId}:modifyPushConfig`,
                        body: options.body
                    });
                },
                modifyAckDeadline: async (options: {
                    params: {
                        subscriptionId: string;
                        projectId: string;
                    }
                    body: {
                        ackIds: string[];
                        ackDeadlineSeconds: number;
                    }
                }): Promise<any> => {
                    return await this.call({
                        method: 'POST',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/subscriptions/${options.params.subscriptionId}:modifyAckDeadline`,
                        body: options.body
                    });
                },
                delete: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                setIamPolicy: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                getIamPolicy: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                testIamPermissions: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
            },
            topics: {
                create: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'PUT',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}`
                    });
                },
                get: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}`
                    });
                },
                list: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                publish: async (options: {
                    params: {
                        topicId: string;
                        projectId: string;
                    }
                    body: {
                        messages: Message[]
                    }
                }): Promise<any> => {
                    return await this.call({
                        method: 'POST',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.params.projectId}/topics/${options.params.topicId}:publish`,
                        body: options.body
                    });
                },
                delete: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                setIamPolicy: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                getIamPolicy: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                testIamPermissions: async (options: any): Promise<any> => {
                    return await this.call({
                        method: 'GET',
                        host: 'pubsub.googleapis.com',
                        path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                    });
                },
                subscriptions: {
                    list: async (options: any): Promise<any> => {
                        return await this.call({
                            method: 'GET',
                            host: 'pubsub.googleapis.com',
                            path: `/v1/projects/${options.projectId}/topics/${options.topicId}/subscriptions`
                        });
                    }
                }
            }
        }
    }
   
    async createTopic(options: { projectId, topicId }) {
        let result;
        try {
            result = await this.resource.topics.create(options);
        } catch (ex) {
            if (ex.code == 409) {
                result = await this.resource.topics.get(options);
            } else {
                throw ex;
            }
        }
        return new PubsubTopic(this, Object.assign(result, options));
    }

}

