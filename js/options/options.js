import { storage } from '../storage.js';
import { environment } from '../environment.js'


function setInputValue(input, value) {
    console.log('onChange', input.id, value)
    if (typeof value === 'boolean') {
        input.checked = value;
    } else {
        if (input.attributes['type'].value === 'range') input.MaterialSlider && input.MaterialSlider.change(value);
        else input.value = value;
    }
}
// storage.onChange().subscribe()
storage.onChange().subscribe( appData => {
    Object.keys(appData).forEach( key => {
        document.querySelectorAll(`div.option input[id='${key}']`)
            .forEach( input => setInputValue(input, appData[key]))
    })
    console.log(appData);
    if (appData.apiKey) {
        document.querySelector('#loginDiv').style.display = 'none'
        document.querySelectorAll('.usernameSlug').forEach(
            slug => slug.innerHTML = appData.username )
        document.querySelector('#logoutDiv').style.display = ''
    }
});

document.querySelectorAll('div.option input[type="checkbox"]').forEach( el => {
    storage.appDataAsync().then( store => el.checked = store[el.name] );
    el.addEventListener( 'change', (event) => {
        const { name, checked } = event.target;
        storage.setAppData({
            [name]: checked
        })
    })
});

document.querySelector('#login').addEventListener('click', () => {
    console.log('login clicked')
    const username = document.querySelector('#username').value
    const password = document.querySelector('#password').value
    document.querySelector('#password').value = ''
    login(username, password).then( () => {
        document.querySelector('#loginDiv').style.display = 'none'
        document.querySelectorAll('.usernameSlug').forEach( slug => slug.innerHTML = username )
        document.querySelector('#logoutDiv').style.display = ''
    })
})
document.querySelector('#logout').addEventListener('click', () => {
    console.log('logout clicked')
    storage.setAppData({ apiKey: null }).then()
    document.querySelector('#loginDiv').style.display = ''
    document.querySelector('#logoutDiv').style.display = 'none'
})

async function login(username, password) {
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
        .catch( err => console.error(err) )

    return storage.setAppData({
        username,
        apiKey
    })

}
