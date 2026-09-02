const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sessionKey='lucid-supabase-session';
export const databaseConfigured=Boolean(url&&key);
const json=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||body?.error_description||body?.error||'Something went wrong.');return body};
const headers=(token,extra={})=>({apikey:key,Authorization:`Bearer ${token||key}`,...extra});
export const getSession=()=>{try{return JSON.parse(localStorage.getItem(sessionKey))}catch{return null}};
export async function signIn(email,password){const data=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:headers(null,{'Content-Type':'application/json'}),body:JSON.stringify({email,password})}).then(json);const session={access_token:data.access_token,refresh_token:data.refresh_token,user:data.user};localStorage.setItem(sessionKey,JSON.stringify(session));return session}
export function signOut(){localStorage.removeItem(sessionKey)}
export async function fetchFlash(){return fetch(`${url}/rest/v1/flash?select=*&order=sort_order.desc,created_at.desc`,{headers:headers()}).then(json)}
export async function uploadImage(file,path){await fetch(`${url}/storage/v1/object/flash-images/${path}`,{method:'POST',headers:headers(getSession()?.access_token,{'Content-Type':file.type,'x-upsert':'false'}),body:file}).then(json);return`${url}/storage/v1/object/public/flash-images/${path}`}
export async function removeImage(path){return fetch(`${url}/storage/v1/object/flash-images/${path}`,{method:'DELETE',headers:headers()}).then(json)}
export async function insertFlash(record){return fetch(`${url}/rest/v1/flash`,{method:'POST',headers:headers(getSession()?.access_token,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(record)}).then(async r=>{if(!r.ok)await json(r)})}
export async function deleteFlash(id){return fetch(`${url}/rest/v1/flash?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers(getSession()?.access_token,{Prefer:'return=minimal'})}).then(async r=>{if(!r.ok)await json(r)})}

export async function fetchTattoos(){return fetch(`${url}/rest/v1/tattoo_gallery?select=*&order=sort_order.desc,created_at.desc`,{headers:headers()}).then(json)}
export async function uploadTattooImage(file,path){await fetch(`${url}/storage/v1/object/tattoo-images/${path}`,{method:'POST',headers:headers(getSession()?.access_token,{'Content-Type':file.type,'x-upsert':'false'}),body:file}).then(json);return`${url}/storage/v1/object/public/tattoo-images/${path}`}
export async function removeTattooImage(path){return fetch(`${url}/storage/v1/object/tattoo-images/${path}`,{method:'DELETE',headers:headers()}).then(json)}
export async function insertTattoo(record){return fetch(`${url}/rest/v1/tattoo_gallery`,{method:'POST',headers:headers(getSession()?.access_token,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(record)}).then(async r=>{if(!r.ok)await json(r)})}
export async function deleteTattoo(id){return fetch(`${url}/rest/v1/tattoo_gallery?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:headers(getSession()?.access_token,{Prefer:'return=minimal'})}).then(async r=>{if(!r.ok)await json(r)})}
