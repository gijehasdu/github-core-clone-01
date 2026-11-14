import { createServer, type Server } from 'node:http';
import { handleGit } from './git.ts';
import { handleRest } from './rest.ts';
import { handleGraphQL } from './graphql.ts';
import { handleMcp } from './mcp.ts';
function json(res:any,status:number,value:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(value)+'\n');}
let requestCounter=0;
export function createApp():Server{return createServer(async(req,res)=>{res.setHeader('x-github-request-id','req-'+(++requestCounter));try{const url=new URL(req.url??'/',`http://${req.headers.host??'localhost'}`),parts=url.pathname.split('/').filter(Boolean);if(url.pathname.startsWith('/api/')||url.pathname==='/mcp'){const token=process.env.MAKEFUN_SHOP_TOKEN??'';if(token&&req.headers.authorization!==`Bearer ${token}`){json(res,401,{message:'Bad credentials'});return;}}if(req.method==='GET'&&url.pathname==='/healthz'){json(res,200,{ok:true});return;}if(parts[1]?.endsWith('.git')){await handleGit(req,res,url);return;}if(url.pathname==='/api/v3'||url.pathname.startsWith('/api/v3/')){await handleRest(req,res,url);return;}if(url.pathname==='/api/graphql'){await handleGraphQL(req,res);return;}if(url.pathname==='/mcp'){await handleMcp(req,res);return;}json(res,404,{message:'Not Found'});}catch{if(!res.headersSent)json(res,500,{message:'Internal Server Error'});else res.end();}});}
