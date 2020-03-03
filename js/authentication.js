import { storage } from './storage.js'
import { environment } from './environment.js'

export async function login(username, password) {
    let formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const { apiKey } = await fetch(`${environment.baseUrl}/account/api/`, {
        method: 'POST', 
        body: formData,
    }).then( res => res.json() )
        .then( response => {
            if (!response.apikey) {
                return new Promise( (res, rej) => rej(response) )
            }
            return response
        })
        .then( res => ({apiKey: res.apikey}))

    return storage.setAppData({
        username,
        apiKey
    })
}
