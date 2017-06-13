import {Meta} from "@ecmal/runtime/decorators";
import {Mirror} from "@ecmal/runtime/reflect";

import {GoogleApi} from "./api"
import { GoogleTrace, GoogleSpan } from "./trace/api";

let ga = new GoogleApi({
    keyFile: "/Users/Sergey/Documents/Keys/GC/mamble-poc.json",
    project: "mamble-poc",
    scopes: [
        GoogleApi.SCOPES.LOGGING_ADMIN,
        GoogleApi.SCOPES.LOGGING_READ,
        GoogleApi.SCOPES.LOGGING_WRITE,
        GoogleApi.SCOPES.TRACE_APPEND,
        GoogleApi.SCOPES.TRACE_READONLY
    ]
})

export function main(){

    let logger = ga.logging.getProjectLog('local');
    let tracer = ga.tracing.getTracer("RPC_CLIENT");

    async function wait(min,max){
        return new Promise((accept)=>{
            setTimeout(accept, Math.max(min * 1000 , max * Math.random() * 1000));
        })
    }

    async function downloadSchema(job,day: string, span: GoogleSpan) {
        //console.info('    download/schema', day);
        let root = span.child(`${job}/download/schema`).set({
            day: '01-01-2017'
        })
        await wait(0,2);
        root.end();
    }
    async function downloadReport(job,day: string, span: GoogleSpan) {
        //console.info('    download/report',day)
        let root = span.child(`${job}/download/report`).set({
            day: day
        })
        await wait(0, 2);
        root.end();
    }
    
    async function downloadDay(job,day:string,span:GoogleSpan){
        //console.info('  download/day')
        let root = span.child(`${job}/download/day`).set({
            day: day
        })

        await downloadSchema(job, day, root);
        await downloadReport(job, day, root);

        root.end();
    }
    async function downloadDays(job,year) {
        //console.info('download')
        let trace = tracer.trace(`${job}/download`).set({
            start_date: `01-01-${year}`,
            end_date: `01-03-${year}`
        });
        await Promise.all([
            downloadDay(job,`01-01-${year}`, trace.root),
            downloadDay(job,`01-02-${year}`, trace.root),
            downloadDay(job,`01-03-${year}`, trace.root)
        ]);
        trace.done();
    }

    async function run(){
        let x = 0;
        while(true){
            console.info('run',x++);
            await Promise.all([
                downloadDays('taboola', '2015'),
                downloadDays('yahoo', '2016'),
                downloadDays('google', '2017'),
                downloadDays('cake', '2018')
            ])
        }
    }
    
    run()

    /*logger.info('Application Started',{
        labels : {
            class_name: 'main',
            start_date: new Date()
        }
    });*/
}
