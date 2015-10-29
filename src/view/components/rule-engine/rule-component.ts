/// <reference path="../../../../jspm_packages/npm/angular2@2.0.0-alpha.44/angular2.d.ts" />
/// <reference path="../../../../jspm_packages/npm/@reactivex/rxjs@5.0.0-alpha.4/dist/cjs/Rx.d.ts" />

import {NgFor, NgIf, Component, Directive, View, ElementRef, Inject} from 'angular2/angular2';

import {RuleActionComponent} from './rule-action-component';
import {ConditionGroupComponent} from './rule-condition-group-component';

//noinspection TypeScriptCheckImport
import {InputToggle} from 'view/components/input/toggle/InputToggle'
import {ApiRoot} from 'api/persistence/ApiRoot';

import {RuleService, RuleModel} from "api/rule-engine/Rule";
import {ActionService, ActionModel} from "api/rule-engine/Action";
import {CwChangeEvent} from "api/util/CwEvent";
import {EntityMeta} from "api/persistence/EntityBase";
import {ConditionGroupModel} from "api/rule-engine/ConditionGroup";
import {ConditionGroupService} from "../../../api/rule-engine/ConditionGroup";


var rsrc = {
  fireOn: {
    EVERY_PAGE: 'Every Page',
    ONCE_PER_VISIT: 'Once per visit',
    ONCE_PER_VISITOR: 'Once per visitor',
    EVERY_REQUEST: 'Every Request'
  }
}

@Component({
  selector: 'rule',
  properties: ["rule", "hidden"]
})
@View({
  template: `<div flex layout="column" class="cw-rule" [class.cw-hidden]="hidden">
  <div flex="grow" layout="row" layout-align="space-between-center" class="cw-header" *ng-if="!hidden" (click)="toggleCollapsed()">
    <i class="caret icon" [class.right]="collapsed" [class.down]="!collapsed" aria-hidden="true" ></i>
    <input flex type="text" class="cw-name cw-input" placeholder="Describe the rule"
      [value]="rule.name"
      (change)="setRuleName($event.target.value)"
      (focus)="collapsed = false"
      (click)="$event.stopPropagation()"
      >
    <select [value]="rule.fireOn" (change)="setFireOn($event.target.value)" (click)="$event.stopPropagation()">
      <option value="EVERY_PAGE" [selected]="rule.fireOn === 'EVERY_PAGE'">{{fireOnLabel('EVERY_PAGE')}}</option>
      <option value="ONCE_PER_VISIT" [selected]="rule.fireOn === 'ONCE_PER_VISIT'">{{fireOnLabel('ONCE_PER_VISIT')}}</option>
      <option value="ONCE_PER_VISITOR" [selected]="rule.fireOn === 'ONCE_PER_VISITOR'">{{fireOnLabel('ONCE_PER_VISITOR')}}</option>
      <option value="EVERY_REQUEST" [selected]="rule.fireOn === 'EVERY_REQUEST'">{{fireOnLabel('EVERY_REQUEST')}}</option>
    </select>
    <cw-toggle-input class="cw-input"
    [value]="rule.enabled"
    (toggle)="rule.enabled = $event.target.value"
    (click)="$event.stopPropagation()">
    </cw-toggle-input>
    <div class="cw-btn-group">
      <div class="ui basic icon buttons">
        <button class="ui button" aria-label="Delete Rule" (click)="removeRule()">
          <i class="trash icon"></i>
        </button>
        <button class="ui button" arial-label="Add Group" (click)="addGroup(); collapsed=false; $event.stopPropagation()">
          <i class="plus icon" aria-hidden="true" ></i>
        </button>
      </div>
    </div>
  </div>
  <div flex layout="column" class="cw-accordion-body" [class.cw-hidden]="collapsed">
    <condition-group flex="grow" layout="row" *ng-for="var group of groups; var i=index"
                     [rule]="rule"
                     [group]="group"
                     [group-index]="i"></condition-group>
    <div flex layout="column" layout-align="center-start" class="cw-action-separator">
      This rule sets the following action(s)
    </div>
    <div flex="100" layout="column" class="cw-rule-actions">
      <button class="cw-add-action-button ui button" arial-label="Add Action" (click)="addAction(); collapsed=false;" *ng-if="actions.length === 0">
        <i class="plus icon" aria-hidden="true"></i>
      </button>
      <rule-action flex *ng-for="var action of actions; var i=index" [action]="action"></rule-action>
    </div>
  </div>
</div>

`,
  directives: [InputToggle, RuleActionComponent, ConditionGroupComponent, NgIf, NgFor]
})
class RuleComponent {
  _rule:RuleModel
  actions:Array<ActionModel>
  groups:Array<ConditionGroupModel>

  hidden:boolean
  collapsed:boolean

  elementRef:ElementRef
  private ruleService:RuleService
  private actionService:ActionService
  private groupService:ConditionGroupService

  private actionStub:ActionModel
  //noinspection TypeScriptUnresolvedVariable
  private actionStubWatch:Rx.Subscriber


  constructor(elementRef:ElementRef,
              @Inject(RuleService) ruleService:RuleService,
              @Inject(ActionService) actionService:ActionService,
              @Inject(ConditionGroupService) conditionGroupService:ConditionGroupService ) {
    this.elementRef = elementRef
    this.actionService = actionService
    this.ruleService = ruleService;
    this.groupService = conditionGroupService;

    this.groups = []
    this.actions = []

    this.hidden = false
    this.collapsed = true
  }

  onInit() {
    if (!this.rule.isPersisted()) {
      var el:Element = this.elementRef.nativeElement
      window.setTimeout(function () {
        var els = el.getElementsByClassName('cw-name')
        if(els[0]) {
          els[0]['focus']();
        }
      }, 50) //avoid tick recursively error
    }
  }

  set rule(rule:RuleModel) {
    this._rule = rule
    this.actionService.onAdd.subscribe((action:ActionModel) => this.handleActionAdd(action), (err) => this.handleActionAddError(err))
    this.actionService.onRemove.subscribe((action:ActionModel) => this.handleActionRemove(action), (err) => this.handleActionRemoveError(err))
    this.actionService.list(this.rule)

    this.groupService.onAdd.subscribe((group:ConditionGroupModel) => this.handleGroupAdd(group), (err) => this.handleGroupAddError(err))
    this.groupService.onRemove.subscribe((group:ConditionGroupModel) => this.handleGroupRemove(group), (err) => this.handleGroupRemoveError(err))
    this.groupService.list(this.rule)

    //this.groups = Object.keys(rule.groups).map((key)=>{
    //  return rule.groups[key]
    //})

  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed
  }

  get rule():RuleModel {
    return this._rule
  }

  fireOnLabel(fireOnId:string) {
    return rsrc.fireOn[fireOnId];
  }

  setFireOn(value:string) {
    this.rule.fireOn = value
    this.updateRule()
  }

  setRuleName(name:string) {
    this.rule.name = name
    this.updateRule()
  }

  addGroup() {
    let group = new ConditionGroupModel()
    group.owningRule = this._rule
    group.priority = 10
    group.operator = 'AND'
    this.groupService.add(group)
  }

  addAction() {
    this.actionStub = new ActionModel()
    this.actionStub.owningRule = this.rule
    this.actions.push(this.actionStub)
    this.actionStubWatch = this.actionStub.onChange.subscribe((vcEvent:CwChangeEvent<ActionModel>)=>{
      if(vcEvent.target.valid) {
        this.actionService.add(this.actionStub)
      }
    })
  }

  handleActionAdd(action:ActionModel) {
    if(action.owningRule.key === this.rule.key){
      if(action == this.actionStub){
        this.actionStub = null
        //noinspection TypeScriptUnresolvedFunction
        this.actionStubWatch.unsubscribe()
      } else if(this.actions.indexOf(action) == -1) {
        this.actions.push(action)
      }
    }
  }

  handleActionAddError(err:any) {

  }

  handleActionRemove(action:ActionModel) {
    this.actions = this.actions.filter((aryAction)=>{
      return aryAction.key != action.key
    })
  }

  handleActionRemoveError(err:any) {

  }


  handleGroupAdd(group:ConditionGroupModel) {
    if(group.owningRule.key === this.rule.key){
      this.groups.push(group)
    }
  }

  handleGroupAddError(err:any) {

  }

  handleGroupRemove(group:ConditionGroupModel) {

  }

  handleGroupRemoveError(err:any) {

  }

  removeRule() {
    if (confirm('Are you sure you want delete this rule?')) {
      this.ruleService.remove(this.rule)
    }
  }

  updateRule() {
    //return this.ruleSnap.ref().set(this.rule)
  }


}

export {RuleComponent}