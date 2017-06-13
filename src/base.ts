import * as Qs from "@ecmal/node/querystring";

import {HttpHeaders} from "@ecmal/http/common";
import {AgentOptions} from "@ecmal/node/https";
import {Socket} from "@ecmal/node/net";
import {GoogleApiOptions} from "./api";
import {GoogleAuth} from "./auth";
import {GoogleLogging} from "./logging/api";

import {Buffer} from "@ecmal/node/buffer";

import {HttpClient,HttpsClient,HttpRequest,HttpResponse} from "@ecmal/http/client";


export interface GoogleRequest {
    protocol?: "http:" | "https:";
    host?: string;
    method?: string;
    path?: string;
    headers?: { [key: string]: any };
    timeout?: number;
    query?:any;
    body?:any;
    file?:string;
    media?:{
        contentType:string;
        contentSize:number;
        contentBody:Buffer;
    };
}
export class GoogleApiResponse extends HttpResponse {
    async json():Promise<any>{
        let json = {};
        let text = await super.text();
        if(text && text.length){
            json = JSON.parse(text);
        }
        return json;
    }
}
export class GoogleApiRequest<T extends GoogleApiResponse> extends HttpRequest<T> {
    constructor(options:GoogleRequest,api:GoogleApiBase,responseType?:Constructor<T>){
        let transport;
        if(options.protocol=="http:"){
            options.protocol="http:";
            transport = api.http;
        }else{
            options.protocol="https:";
            transport = api.https;
        }
        if(options.query){
            options.path+='?'+Qs.stringify(options.query);
        }
        super(options,responseType,transport);
    }
    async send(text?:string|Buffer){
        if(text){
            if(!Buffer.isBuffer(text)){
                text = new Buffer(text,'utf8');
            }
            return super.send(text);
        }else{
            return super.send();
        }
    }
    async sendWwwForm(data){
        this.setHeader("content-type","application/x-www-form-urlencoded");
        this.setHeader("cache-control","no-cache");
        return this.send(`${Qs.stringify(data)}\n`);
    }
}
export class HttpTransport extends HttpClient {
    constructor(readonly options:AgentOptions){
        super(options);
    }
    createConnection(options, cb){
        options.path = null;
        return super.createConnection( options, cb);
    }
}
export class HttpsTransport extends HttpsClient {
    constructor(readonly options:AgentOptions){
        super(options);
    }
}
export class GoogleApiError extends Error {
    readonly code:number; 
    readonly message:string;
    readonly errors:any[];
    constructor(error : {
        code        : number, 
        message     : string, 
        errors      : any[]
    }){
        error.message = `${error.code?error.code+': ':''}${error.message}`;
        if(Array.isArray(error.errors)){
            error.message = `${error.message}\n${error.errors.map(e=>e.message).join('\n')}`
        }
        super(error.message);
        Object.assign(this,error);
    }
}
export class GoogleApiBase {
    readonly http:HttpTransport;
    readonly https:HttpsTransport;
    readonly auth:GoogleAuth;
    
    constructor(readonly options:GoogleApiOptions){
        Object.defineProperties(this,{
            http  : { value : new HttpTransport(options as AgentOptions) },
            https : { value : new HttpsTransport(options as AgentOptions) },
            auth  : { value : new GoogleAuth(this) },
        });
    }
    public request(options:GoogleRequest){
        return new GoogleApiRequest(options,this,GoogleApiResponse);
    }
    public async call(options:GoogleRequest){
        function multipart(parts:any[]){
            let boundry = Date.now().toString(32)+''+String(Math.random()).substring(2);
            let media = { 
                contentType : `multipart/related; boundary=${boundry}`, 
                contentSize : 0,
                contentBody : null
            }
            parts = parts.map(part=>{
                if(Buffer.isBuffer(part.contentBody)){
                    part.contentType = part.contentType || 'application/octet-stream';
                } else
                if(typeof part.contentBody == 'object'){
                    part.contentType = part.contentType || 'application/json';
                    part.contentBody = new Buffer(JSON.stringify(part.contentBody,null,2));
                } else {
                    part.contentType = part.contentType || 'text/plain';
                    part.contentBody = new Buffer(String(part.contentBody))
                } 
                part.contentSize = part.contentBody.length;
                let headers = new Buffer([
                    `--${boundry}`,
                    `content-type: ${part.contentType}`,
                    `content-length: ${part.contentSize}`,
                    '',''
                ].join('\r\n'));
                
                let contents = [headers,part.contentBody,new Buffer('\r\n')];
                return Buffer.concat(contents)
            });
            parts.push(new Buffer(`--${boundry}--`))
            media.contentBody = Buffer.concat(parts);
            media.contentSize = media.contentBody.length;
            return media;
        }
        let body:Buffer = void 0;
        let type:string = void 0;
        
        if(options.media){
            await this.auth.refresh();
            if(options.body){
                body = options.body;
                delete options.body;
                options.media = multipart([
                    {contentBody:body},
                    options.media
                ])
            }            
            type = options.media.contentType;
            body = options.media.contentBody;
            delete options.media;
        }

        if(options.body){
            body = options.body;
            if(Buffer.isBuffer(body)){
                type = type || 'application/octet-stream';
            } else
            if(typeof body == 'object'){
                type = type || 'application/json';
                body = new Buffer(JSON.stringify(body,null,2));
            } else {
                type = type || 'text/plain';
                body = new Buffer(String(body))
            }
        }
        
        if(!options.headers){
            options.headers = {}
        }
        //console.info(options)
        if(body){
            //console.info('======= BODY ====== {')
            //console.info(body.toString('utf8'));
            //console.info('======= BODY ====== }')
            options.headers['content-type'] = type;
            options.headers['content-size'] = body.length;
        }
        options.headers['authorization'] = this.auth.header;
      
        let sendRequest = async ()=>{
            let req = this.request(options);
            let res = await req.send(body);
            let obj = await res.json();
            //console.info(res.statusCode,res.statusMessage,obj);
            
            if(obj.error){
                throw new GoogleApiError(obj.error);
            }else{
                return obj;
            }
        }
        let result = null;
        try{
            result = await sendRequest();
        }catch(ex){
            if(ex.code == 401 || ex.code == 403){
                options.headers.authorization = await this.auth.refresh();
                result = await sendRequest();
            }else{
                throw ex;
            }

        }
        return result;
    }
}