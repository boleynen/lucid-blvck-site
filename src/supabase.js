import { createSessionClient, responseJson } from './auth-session.js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const databaseConfigured=Boolean(url&&key);
const json=responseJson;
const headers=(token,extra={})=>({apikey:key,Authorization:`Bearer ${token||key}`,...extra});
const client=createSessionClient({url,key,storage:localStorage,onExpired:()=>window.dispatchEvent(new Event('lucid-session-expired'))});
export const getSession=client.getSession;
export const signIn=client.signIn;
export const signOut=client.signOut;
const authenticatedFetch=client.request;
export async function fetchFlash(){return fetch(`${url}/rest/v1/flash?select=*&order=sort_order.desc,created_at.desc`,{headers:headers()}).then(json)}
export async function uploadImage(file,path){await authenticatedFetch(`${url}/storage/v1/object/flash-images/${path}`,{method:'POST',headers:headers(null,{'Content-Type':file.type,'x-upsert':'false'}),body:file}).then(json);return`${url}/storage/v1/object/public/flash-images/${path}`}
export async function removeImage(path){return authenticatedFetch(`${url}/storage/v1/object/flash-images/${path}`,{method:'DELETE',headers:headers()}).then(json)}
export async function insertFlash(record){return authenticatedFetch(`${url}/rest/v1/flash`,{method:'POST',headers:headers(null,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(record)}).then(async r=>{if(!r.ok)await json(r)})}
export async function deleteFlash(id){return authenticatedFetch(`${url}/rest/v1/flash?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers(null,{Prefer:'return=minimal'})}).then(async r=>{if(!r.ok)await json(r)})}

export async function fetchTattoos(){return fetch(`${url}/rest/v1/tattoo_gallery?select=*&order=sort_order.desc,created_at.desc`,{headers:headers()}).then(json)}
export async function uploadTattooImage(file,path){await authenticatedFetch(`${url}/storage/v1/object/tattoo-images/${path}`,{method:'POST',headers:headers(null,{'Content-Type':file.type,'x-upsert':'false'}),body:file}).then(json);return`${url}/storage/v1/object/public/tattoo-images/${path}`}
export async function removeTattooImage(path){return authenticatedFetch(`${url}/storage/v1/object/tattoo-images/${path}`,{method:'DELETE',headers:headers()}).then(json)}
export async function insertTattoo(record){return authenticatedFetch(`${url}/rest/v1/tattoo_gallery`,{method:'POST',headers:headers(null,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(record)}).then(async r=>{if(!r.ok)await json(r)})}
export async function deleteTattoo(id){return authenticatedFetch(`${url}/rest/v1/tattoo_gallery?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers(null,{Prefer:'return=minimal'})}).then(async r=>{if(!r.ok)await json(r)})}

export async function fetchShopProducts(){return fetch(`${url}/rest/v1/shop_products?select=*&active=eq.true&order=sort_order.desc,created_at.desc`,{headers:headers()}).then(json)}
export async function uploadShopImage(file,path){await authenticatedFetch(`${url}/storage/v1/object/shop-images/${path}`,{method:'POST',headers:headers(null,{'Content-Type':file.type,'x-upsert':'false'}),body:file}).then(json);return`${url}/storage/v1/object/public/shop-images/${path}`}
export async function removeShopImage(path){return authenticatedFetch(`${url}/storage/v1/object/shop-images/${path}`,{method:'DELETE',headers:headers()}).then(json)}
export async function insertShopProduct(record){return authenticatedFetch(`${url}/rest/v1/shop_products`,{method:'POST',headers:headers(null,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(record)}).then(async r=>{if(!r.ok)await json(r)})}
export async function deleteShopProduct(id){return authenticatedFetch(`${url}/rest/v1/shop_products?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers(null,{Prefer:'return=minimal'})}).then(async r=>{if(!r.ok)await json(r)})}
