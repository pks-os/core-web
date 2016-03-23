import {EventEmitter, Injectable} from 'angular2/core'
import {Http, Response, RequestMethod, Request, Headers} from 'angular2/http'
import {Observable, BehaviorSubject} from 'rxjs/Rx'

import {ApiRoot} from "../persistence/ApiRoot";
import {
    hasContent, ResponseError, CwError, NETWORK_CONNECTION_ERROR, UNKNOWN_RESPONSE_ERROR,
    CLIENTS_ONLY_MESSAGES, SERVER_RESPONSE_ERROR
} from "../system/http-response-util";
import {ServerSideFieldModel, ServerSideTypeModel} from "./ServerSideFieldModel";
import {I18nService} from "../system/locale/I18n";


export const RULE_CREATE = 'RULE_CREATE'
export const RULE_DELETE = 'RULE_DELETE'
export const RULE_UPDATE_NAME = 'RULE_UPDATE_NAME'
export const RULE_UPDATE_ENABLED_STATE = 'RULE_UPDATE_ENABLED_STATE'

export const V_RULE_UPDATE_EXPANDED_STATE = 'V_RULE_UPDATE_EXPANDED_STATE'

export const RULE_UPDATE_FIRE_ON = 'RULE_UPDATE_FIRE_ON'

export const RULE_RULE_ACTION_CREATE = 'RULE_RULE_ACTION_CREATE'
export const RULE_RULE_ACTION_DELETE = 'RULE_RULE_ACTION_DELETE'
export const RULE_RULE_ACTION_UPDATE_TYPE = 'RULE_RULE_ACTION_UPDATE_TYPE'
export const RULE_RULE_ACTION_UPDATE_PARAMETER = 'RULE_RULE_ACTION_UPDATE_PARAMETER'

export const RULE_CONDITION_GROUP_UPDATE_OPERATOR = 'RULE_CONDITION_GROUP_UPDATE_OPERATOR'
export const RULE_CONDITION_GROUP_DELETE = 'RULE_CONDITION_GROUP_DELETE'
export const RULE_CONDITION_GROUP_CREATE = 'RULE_CONDITION_GROUP_CREATE'

export const RULE_CONDITION_CREATE = 'RULE_CONDITION_CREATE'
export const RULE_CONDITION_DELETE = 'RULE_CONDITION_DELETE'
export const RULE_CONDITION_UPDATE_TYPE = 'RULE_CONDITION_UPDATE_TYPE'
export const RULE_CONDITION_UPDATE_PARAMETER = 'RULE_CONDITION_UPDATE_PARAMETER'
export const RULE_CONDITION_UPDATE_OPERATOR = 'RULE_CONDITION_UPDATE_OPERATOR'

var idCounter = 1000
export function getNextId():string {
  return 'tempId' + ++idCounter
}

export class RuleEngineState {
  loading:boolean = true
  saving:boolean = false
  hasError:boolean = false
  filter:string = ''
  deleting:boolean = false
}


export interface IRecord {
  _id?:string,
  _saving?:boolean
  _saved?:boolean
  deleting?:boolean
  errors?:any
  set?(string, any):any
}

export interface IUser {
  firstName?: string,
  lastName?: string,
  roleId?: string,
  userId?: string
}

export interface IBundle {
  name?: string,
  id?: string
}

export interface IPublishEnvironment {
  name?: string,
  id?: string
}

export interface IRuleAction extends IRecord {
  id?:string
  priority:number,
  type?:string
  parameters?:{[key:string]:any},
  owningRule?:string,
  _owningRule?:RuleModel
}

export interface ICondition extends IRecord {
  id?:string
  conditionlet?:string
  type?:string
  priority?:number,
  operator?:string
  parameters?:{[key:string]:any}
  _type?:ServerSideTypeModel
}

export interface IConditionGroup extends IRecord {
  id?:string
  priority:number,
  operator:string
  conditions?:any
}

export interface IRule extends IRecord {
  priority?:number
  name?:string
  fireOn?:string
  enabled?:boolean
  conditionGroups?:any
  ruleActions?:any
  set?(string, any):IRule
  id?:string
  _saving?:boolean
  _saved?:boolean
  deleting?:boolean
  _id?:string
  _expanded?:boolean
  _ruleActions?:ActionModel[]
  _conditionGroups?:ConditionGroupModel[]
  _ruleActionsLoaded?:boolean
  _errors?:CwError[]
}


export interface ParameterModel {
  key:string
  value:string
  priority:number
}


export class ActionModel extends ServerSideFieldModel {
  owningRule:string
  _owningRule:RuleModel

  constructor(key:string, type:ServerSideTypeModel, priority:number = 1) {
    super(key, type, priority)
    this.priority = priority || 1
    this.type = type
  }

  isValid():boolean {
    try {
      return super.isValid()
    } catch (e) {
      console.error(e)
    }
  }
}

export class ConditionModel extends ServerSideFieldModel {
  operator:string = 'AND'
  conditionlet:string

  constructor(iCondition:ICondition) {
    super(iCondition.id, iCondition._type)
    this.conditionlet = iCondition.conditionlet
    this.key = iCondition.id
    this.priority = iCondition.priority || 1
    this.type = iCondition._type
    this.operator = iCondition.operator || 'AND'
  }

  isValid() {
    try {
      return !!this.getParameterValue('comparison') && super.isValid()
    } catch (e) {
      console.error(e)
    }
  }
}

export class ConditionGroupModel {

  key:string
  priority:number

  operator:string
  conditions:{ [key:string]:boolean }
  _id:string
  _conditions:ConditionModel[] = []

  constructor(iGroup:IConditionGroup) {
    Object.assign(this, iGroup)
    this.key = iGroup.id
    this._id = this.key != null ? this.key : getNextId()
    this.conditions = iGroup.conditions || {}
  }

  isPersisted() {
    return this.key != null
  }

  isValid() {
    let valid = this.operator && (this.operator === 'AND' || this.operator === 'OR')
    return valid
  }
}

export class RuleModel {
  key:string
  name:string
  enabled:boolean = false
  priority:number
  fireOn:string
  conditionGroups:{ [key:string]:ConditionGroupModel } = {}
  ruleActions:{ [key:string]:boolean } = {}

  _id:string
  _expanded:boolean = false
  _conditionGroups:ConditionGroupModel[] = []
  _ruleActions:ActionModel[] = []
  _saved:boolean = true
  _saving:boolean = false
  _deleting:boolean = true
  _errors:{[key:string]:any}


  constructor(iRule:IRule) {
    Object.assign(this, iRule)
    this.key = iRule.id
    this._id = this.key != null ? this.key : getNextId()
    let conGroups = Object.keys(iRule.conditionGroups || {})
    conGroups.forEach((groupId) => {
      let g = this.conditionGroups[groupId]
      let mg = new ConditionGroupModel(Object.assign({id: groupId}, g))
      this.conditionGroups[groupId] = mg
      this._conditionGroups.push(mg)
    })
  }

  isPersisted() {
    return this.key != null
  }

  isValid() {
    let valid = !!this.name
    valid = valid && this.name.trim().length > 0
    return valid
  }
}

export const DEFAULT_RULE:IRule = {
  priority: 1,
  name: null,
  fireOn: "EVERY_PAGE",
  enabled: false,
  conditionGroups: {},
  ruleActions: {},
  _id: -1 + '',
  _expanded: false,
  _ruleActions: [],
  _conditionGroups: []

}

@Injectable()
export class RuleService {
  private _rulesEndpointUrl:string
  private _actionsEndpointUrl:string
  private _conditionTypesEndpointUrl:string
  private _ruleActionTypesEndpointUrl:string
  private _bundleStoreUrl:string
  private _loggedUserUrl:string
  private _addToBundleUrl:string
  private _pushEnvironementsUrl:string
  private _pushRuleUrl:string


  ruleActionTypes$:BehaviorSubject<ServerSideTypeModel[]> = new BehaviorSubject([]);
  conditionTypes$:BehaviorSubject<ServerSideTypeModel[]> = new BehaviorSubject([]);

  private _ruleActions:{[key:string]:ActionModel} = {}
  private _conditions:{[key:string]:ConditionModel} = {}

  _ruleActionTypes:{[key:string]:ServerSideTypeModel} = {}
  private _ruleActionTypesAry:ServerSideTypeModel[] = []

  _conditionTypes:{[key:string]:ServerSideTypeModel} = {}
  private _conditionTypesAry:ServerSideTypeModel[] = []

  bundles$:BehaviorSubject<IBundle[]> = new BehaviorSubject([]);
  environments$:BehaviorSubject<IDBEnvironment[]> = new BehaviorSubject([]);
  private _bundlesAry:IBundle[] = []
  private _environmentsAry:IDBEnvironment[] = []

  constructor(private _apiRoot:ApiRoot, private _http:Http, private _resources:I18nService) {
    this._rulesEndpointUrl = `${this._apiRoot.defaultSiteUrl}/ruleengine/rules`
    this._actionsEndpointUrl = `${this._apiRoot.defaultSiteUrl}/ruleengine/actions`
    this._conditionTypesEndpointUrl = `${this._apiRoot.baseUrl}api/v1/system/ruleengine/conditionlets`
    this._ruleActionTypesEndpointUrl = `${this._apiRoot.baseUrl}api/v1/system/ruleengine/actionlets`
    this._bundleStoreUrl = `${this._apiRoot.baseUrl}api/bundle/getunsendbundles/userid` //TODO: dotcms.org.1 fmontes get this user id dinamically
    this._loggedUserUrl = `${this._apiRoot.baseUrl}api/user/getloggedinuser/`
    this._addToBundleUrl = `${this._apiRoot.baseUrl}DotAjaxDirector/com.dotcms.publisher.ajax.RemotePublishAjaxAction/cmd/addToBundle`
    this._pushEnvironementsUrl = `${this._apiRoot.baseUrl}api/environment/loadenvironments/roleId`
    this._pushRuleUrl = `${this._apiRoot.baseUrl}DotAjaxDirector/com.dotcms.publisher.ajax.RemotePublishAjaxAction/cmd/publish`


    this._preCacheCommonResources(_resources)
    this.loadActionTypes().subscribe((types:ServerSideTypeModel[])=> this.ruleActionTypes$.next(types))
    this.loadConditionTypes().subscribe((types:ServerSideTypeModel[])=> this.conditionTypes$.next(types))
  }

  private _preCacheCommonResources(resources:I18nService) {
    resources.get('api.sites.ruleengine').subscribe((rsrc)=> {})
    resources.get('api.ruleengine.system').subscribe((rsrc)=> {})
    resources.get('api.system.ruleengine').subscribe((rsrc)=> {})
  }

  createRule(body:RuleModel):Observable<RuleModel|CwError> {
    return this.request({
      body: RuleService.fromClientRuleTransformFn(body),
      method: RequestMethod.Post,
      url: this._rulesEndpointUrl
    }).map((result:RuleModel)=> {
      body.key = result['id'] // @todo:ggranum type the POST result correctly.
      return Object.assign({}, DEFAULT_RULE, body, result)
    });
  }

  deleteRule(ruleId:string):Observable<{success:boolean}|CwError> {
    return this.request({
      method: RequestMethod.Delete,
      url: `${this._rulesEndpointUrl}/${ruleId}`
    }).map((result)=> {
      return {success: true}
    });
  }

  loadRules():Observable<RuleModel[]|CwError> {
    return this.request({
      method: RequestMethod.Get,
      url: this._rulesEndpointUrl
    }).map(RuleService.fromServerRulesTransformFn);
  }

  loadRule(id:string):Observable<RuleModel|CwError> {
    return this.request({
      method: RequestMethod.Get,
      url: `${this._rulesEndpointUrl}/${id}`
    }).map((result)=> {
      return Object.assign({key: id}, DEFAULT_RULE, result)
    })
  }

  updateRule(id:string, rule:RuleModel):Observable<RuleModel|CwError> {
    let result
    if (!id) {
      result = this.createRule(rule)
    }
    else {
      result = this.request({
        body: RuleService.fromClientRuleTransformFn(rule),
        method: RequestMethod.Put,
        url: `${this._rulesEndpointUrl}/${id}`
      }).map((result)=> {
        let r = Object.assign({}, DEFAULT_RULE, result)
        r.id = id
        return r
      });
    }
    return result
  }

  getConditionTypes():Observable<ServerSideTypeModel[]> {
    return this.request({
      method: RequestMethod.Get,
      url: this._conditionTypesEndpointUrl,
    }).map(RuleService.fromServerServersideTypesTransformFn)
  }

  getRuleActionTypes():Observable<ServerSideTypeModel[]> {
    return this.request({
      method: RequestMethod.Get,
      url: this._ruleActionTypesEndpointUrl,
    }).map(RuleService.fromServerServersideTypesTransformFn)
  }


  private loadActionTypes():Observable<ServerSideTypeModel[]> {
    let obs
    if (this._ruleActionTypesAry.length) {
      obs = Observable.fromArray(this._ruleActionTypesAry)
    } else {
      return this._doLoadRuleActionTypes().map((types:ServerSideTypeModel[])=> {
        types.sort(RuleService.alphaSort('key'))
        types.forEach(type => {
          type._opt = {value: type.key, label: this._resources.get(type.i18nKey + '.name', type.i18nKey)}
          this._ruleActionTypes[type.key] = type
        })
        this._ruleActionTypesAry = types
        return types
      })
    }
    return obs
  }

  _doLoadRuleActionTypes():Observable<ServerSideTypeModel[]> {
    return this.request({
      method: RequestMethod.Get,
      url: this._ruleActionTypesEndpointUrl,
    }).map(RuleService.fromServerServersideTypesTransformFn)
  }

  addRuleToBundle(ruleId:string, bundle:IBundle):Observable<{errorMessages:string[],total:number,errors:number}> {
    return this.request({
      body: `assetIdentifier=${ruleId}&bundleName=${bundle.name}&bundleSelect=${bundle.id}`,
      method: RequestMethod.Post,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      url: this._addToBundleUrl
    })
  }

  getLoggedUser():Observable<IUser> {
    return this.request({
      method: RequestMethod.Get,
      url: this._loggedUserUrl,
    })
  }

  loadBundleStores(){
    let obs
    if (this._bundlesAry.length) {
      obs = Observable.fromArray(this._bundlesAry)
    } else {
      obs = this._doLoadBundleStores().map((bundles:IBundle[])=> {
        this._bundlesAry = bundles
        return bundles
      })
    }
    obs.subscribe((bundles) => this.bundles$.next(bundles))
  }

  _doLoadBundleStores():Observable<IBundle[]> {
    return this.getLoggedUser().flatMap((user:IUser) => {
      return this.request({
        method: RequestMethod.Get,
        url: `${this._bundleStoreUrl}/${user.userId}`,
      }).map(RuleService.fromServerBundleTransformFn)
    })
  }

  loadPublishEnvironments() {
    let obs
    if (this._environmentsAry.length) {
      obs = Observable.fromArray(this._environmentsAry)
    } else {
      obs = this._doLoadPublishEnvironments().map((environments:IDBEnvironment[])=> {
        this._environmentsAry = environments
        return environments
      })
    }
    obs.subscribe((environments) => this.environments$.next(environments))
  }

  _doLoadPublishEnvironments():Observable<IPublishEnvironment[]> {
    return this.getLoggedUser().flatMap((user:IUser) => {
      return this.request({
        method: RequestMethod.Get,
        url: `${this._pushEnvironementsUrl}/${user.roleId}/?name=0`,
      }).map(RuleService.fromServerEnvironmentTransformFn)
    })
  }

  private getFormattedDate(date:Date) {
    let month = (date.getMonth() + 1).toString()
    month += month.length < 2 ? "0" + month : month
    return `${month}-${date.getDate()}-${date.getFullYear()}`
  }

  private getPublishRuleData(ruleId:string, environmentId:string) {
    let resul:string = "";
    resul += `assetIdentifier=${ruleId}`
    resul += `&remotePublishDate=${this.getFormattedDate(new Date())}`
    resul += "&remotePublishTime=00-00"
    resul += `&remotePublishExpireDate=${this.getFormattedDate(new Date())}`
    resul += "&remotePublishExpireTime=00-00"
    resul += "&iWantTo=publish"
    resul += `&whoToSend=${environmentId}`
    resul += "&bundleName="
    resul += "&bundleSelect="
    resul += "&forcePush=false"
    return resul
  }

  pushPublishRule(ruleId:string, environmentId:string):Observable<{errorMessages:string[],total:number,bundleId:string,errors:number}> {
    return this.request({
      body: this.getPublishRuleData(ruleId, environmentId),
      method: RequestMethod.Post,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      url: this._pushRuleUrl
    })
  }

  private loadConditionTypes():Observable<ServerSideTypeModel[]> {
    let obs
    if (this._conditionTypesAry.length) {
      obs = Observable.fromArray(this._conditionTypesAry)
    } else {
      return this._doLoadConditionTypes().map((types:ServerSideTypeModel[])=> {
        types.sort(RuleService.alphaSort('key'))
        types.forEach(type => {
          type._opt = {value: type.key, label: this._resources.get(type.i18nKey + '.name', type.i18nKey)}
          this._conditionTypes[type.key] = type
        })
        this._conditionTypesAry = types
        return types
      })
    }
    return obs
  }

  _doLoadConditionTypes():Observable<ServerSideTypeModel[]> {
    return this.request({
      method: RequestMethod.Get,
      url: this._conditionTypesEndpointUrl,
    }).map(RuleService.fromServerServersideTypesTransformFn)
  }

  request(options:any):Observable<any> {
    let headers:Headers = this._apiRoot.getDefaultRequestHeaders()
    let tempHeaders = options.headers ? options.headers : {"Content-Type": "application/json"}
    Object.keys(tempHeaders).forEach((key)=>{
      headers.set(key, tempHeaders[key])
    })
    var source = options.body
    if (options.body) {
      if (typeof options.body !== 'string') {
        options.body = JSON.stringify(options.body);
      }
    }
    options.headers = headers

    var request = new Request(options)
    return this._http.request(request)
        .map((resp:Response) => {
          return hasContent(resp) ? resp.json() : resp
        })
        .catch((response:Response, original:Observable<any>):Observable<any> => {
          if (response) {
            if (response.status === 500) {
              if (response.text() && response.text().indexOf("ECONNREFUSED") >= 0) {
                throw new CwError(NETWORK_CONNECTION_ERROR, CLIENTS_ONLY_MESSAGES[NETWORK_CONNECTION_ERROR], request, response, source)
              } else {
                throw new CwError(SERVER_RESPONSE_ERROR, response.headers.get('error-message'), request, response, source)
              }
            }
            else if (response.status === 404) {
              console.error("Could not execute request: 404 path not valid.", options.url)
              throw new CwError(UNKNOWN_RESPONSE_ERROR, response.headers.get('error-message'), request, response, source)
            } else {
              console.log("Could not execute request: Response status code: ", response.status, 'error:', response, options.url)
              throw new CwError(UNKNOWN_RESPONSE_ERROR, response.headers.get('error-message'), request, response, source)
            }
          }
          return null
        })
  }

  static fromServerRulesTransformFn(ruleMap):RuleModel[] {
    return Object.keys(ruleMap).map((id:string) => {
      let r:IRule = ruleMap[id]
      r.id = id
      return new RuleModel(r)
    })
  }

  static fromClientRuleTransformFn(rule:RuleModel):any {
    let sendRule = Object.assign({}, DEFAULT_RULE, rule)
    sendRule.key = rule.key
    delete sendRule.id
    sendRule.conditionGroups = {}
    sendRule._conditionGroups.forEach((conditionGroup:ConditionGroupModel)=> {
      if (conditionGroup.key) {
        let sendGroup = {
          operator: conditionGroup.operator,
          priority: conditionGroup.priority,
          conditions: {}
        }
        conditionGroup._conditions.forEach((condition:ConditionModel)=> {
          sendGroup.conditions[condition.key] = true
        })
        sendRule.conditionGroups[conditionGroup.key] = sendGroup
      }
    })
    RuleService.removeMeta(sendRule)
    return sendRule;
  }

  static removeMeta(entity:any) {
    Object.keys(entity).forEach((key)=> {
      if (key[0] == '_') {
        delete entity[key]
      }
    })
  }

  static alphaSort(key) {
    return (a, b) => {
      let x
      if (a[key] > b[key]) {
        x = 1
      } else if (a[key] < b[key]) {
        x = -1
      }
      else {
        x = 0
      }
      return x
    }
  }

  static fromServerBundleTransformFn(data):IBundle[] {
    return data.items || [];
  }

  static fromServerEnvironmentTransformFn(data):IPublishEnvironment[] {
    // Endpoint return extra empty environment
    data.shift()
    return data
  }

  static fromServerServersideTypesTransformFn(typesMap):ServerSideTypeModel[] {
    let types = Object.keys(typesMap).map((key:string) => {
      let json:any = typesMap[key]
      json.key = key
      return ServerSideTypeModel.fromJson(json)
    })
    console.log("RuleService", "fromServerServersideTypesTransformFn - loaded", types)
    return types.filter((type)=> type.key != 'CountRulesActionlet')
  }
}

