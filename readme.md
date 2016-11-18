#Emiya Angular2 DataPool

##How to install
```
npm install --save emiya-angular2-datapool
```


## Features

* provide api to fetch data from remote address or local variable/promise
* provide api to manage data (refresh/cache/destroy/update/notification)


### Usage

```
import {DataPool} from "emiya-angular";

@Component({
  template: `<ion-nav></ion-nav>`
})
export class MyApp {

constructor(platform: Platform, datapool: DataPool,) {
    //below we define 3 datapool with different data sources config
    
    //datapool 0 with fetching data from remote address
    var config0 = {
        id: '0',   //identity for datapool
        bind_tokens: ['uuid', 'token'],  //default is null,setting this means the datapool can only be accessed when token(uuid&token) exists 
        bind_tokens_method: ['local', 'local'], //use together with option bind_token to specify token source,option is local or session,default is local
        period: 3600, //the survival time from cached data,the unit is sec,value<0 means never expired.Once expired，the datapool will try to re-fetch data from sources.
        timeout: 6000,  //timeout of a data request,unit is mili-sec,value<0 means never timeout until the sources return or throw error
        request: {     //remote address config
         method: 'GET',   //request method(get/post/put/delete),default is get
         url: 'http://www.google.com'  //request address
         headers:{uuid:'dasklaslkfh313124124'} //additional added to request header
         params:{userid:'emiyalee'}   //url query params
         data:{password:'fasfgjal;sk2312412'}   //body params
         restful:{index:0}     //restful params,for example a request url like '/abc/:index/' will transform to '/abc/0/' 
        },

        //transform the data structure after successful fetching data and before giving it to caller,support object or function definition 
         transform: {  //object definition
           userPhone: 'phone',  //transform phone to userphone
           read: 'readtime'  //transform readtime to read
         },
         //or equal to
         transform: (org)=>{  //function
         org.userPhone=org.phone
         org.read=org.readtime
         delete org.phone
         delete org.readtime
          return org
         },
         
         
         
        
        //all 3 options below means only when the data return from sources with payload(or header) structure like {data:{list:[{status:'ok'},{..}]}},the request is scueess,otherwise is a failure.
        
        condition_mode: 'payload',//header|payload   //optional,determine the success data flag path(header/payload) 
        condition_path: 'data.list.[0].status',//optional,determine the success data flag path
        condition_value: 'ok',//optional,determine the success data flag value,null means any value representing success,otherwise only value===condition_value means success
        
        
        //all 2 options below means when the request success,the datapool will give you data which from payload(or header),for example.if the payload structure is {data:[{abc:2,index:1},{..}],status:'ok'},you will get {abc:2,index:1} from datapool api
        receive_mode: 'payload',//header|payload
        receive_path: 'data.[0]'
      }
      
      
      //datapool 1 with fetching data from local variable/function/promise
      var config1 = {
        id: '1',
        localData: {abc: 123,list:[{id:0},{id:1}]},
      }
      
      //datapool 2 with fetching data from function
      var config2 = {
        id: '2',
        localData: ()=>{return {abc: 123,list:[{id:0},{id:1}]}},
      }
      
      //datapool 3 with fetching data from promise
      var config3 = {
        id: '3',
        localData: new Promise((resolve,reject)=>{resolve({abc: 123,list:[{id:0},{id:1}]})}),
        //or equal to
        localData: ()=>{return new Promise((resolve,reject)=>{resolve({abc: 123,list:[{id:0},{id:1}]})})},
      }
      
      
      //tell the datapool to load these configs
      datapool.load(config0)
      datapool.load(config1)
      datapool.load(config2)
      datapool.load(config3)
      
      
      //get datapool instance for 1(the id which you specify in config0.id)
      let datapool0=datapool.request('1')  
      
      //read data from datapool
      datapool0.read('abc').then((data)=>{do something}).catch((code)=>{do something})
      datapool0.read().then((data)=>{do something}).catch((code)=>{do something})  //this will return all data to you
      datapool0.readByPath('list.[0].id').then((data)=>{do something}).catch((code)=>{do something}) //return 0 from object:{abc: 123,list:[{id:0},{id:1}]}
      
      //write data to datapool
      datapool0.write('abc0',{id:123})   //add new data abc0 to datapool with value {id:123} and then you can read it later,retrun promise
      datapool0.writeByPath('list.[2]',{id:123}) //new data will be {abc: 123,list:[{id:0},{id:1},{id:123}]}
      
      //remove data from datapool
      datapool0.remove('abc0')
      datapool0.remove()  //this will remove all data,return promise
      datapool0.removeByPath('list.[1]')  //new data will be {abc: 123,list:[{id:0}]}
      
      //force refresh datapool(re-fetch data from source)
      datapool0.refresh()
      
      //get notification when data has been refresh or updated or deleted..
      let lis0=datapool0.onChange((ev)=>{do something},this)
      lis0() //unlisten to this event
      
      //check if you have the access to the datapool
      datapool0.checkValid() //true or false
      
      
      //global operation to all datapools
      datapool.refresh()  //force refresh all datapools(re-fetch data from source)
      let lis=datapool.onChange((ev)=>{do something},this)  //get notification when any data in any datapool has been refresh or updated or deleted..
      lis() //unlisten to this event
      
      //unload a specify datapool
      datapool.unload('0')
      //unload all datapool
      datapool.unload()
  }
}
```

#####datapool can also work with [emiya-angular2-fetch](https://github.com/ionic2-ninja/emiya-angular2-fetch),just replace request.url with the id you define in your fetch config.
```
datapool.load({
 id:"another",
 request:{url:'full'}
})
```


### How to set and delete token

```
import {Router} from 'emiya-angular2-token';

export class TabsPage {

constructor() {
    //set tokon
    Token.set('uuid','fasfasjfasjlk9312jkkfasjfaskl')
    Token.set('token','fasfasjfasjlk9312jkkfasjfaskl')
    //delete token
    Token.delete('uuid')
    Token.delete('token')
    //check if token exists
    Token.has('uuid')   //true or false
    Token.has('token')
  }
}
```
#####more can be found [emiya-angular2-token](https://github.com/ionic2-ninja/emiya-angular2-token)


### Global status code

* -2 the datapool is disabled
* -3 the payload or header return from source is null
* -4 the responds from source is null
* -5 fetching data from source fail
* -6 request timeout
* -7 datapool config is missing
* -8 can not write value to datapool because key is not specified
* -9 no data in the datapool
* -10 trying to read an inexisted variable from datapool
* -12 can not acccess the datapool because of token is not existed
* -15 the payload or header structure fail to pass validation check
* -20 the payload or header structure fail to pass validation check
* -29 data source undefined or not found
* -30 the payload or header return from source is null
* -31 the payload or header return from source is null


### Api Referrences(todo..)


