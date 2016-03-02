import {Component, EventEmitter, Optional } from 'angular2/core';
import { AfterViewInit, Output, Input, ChangeDetectionStrategy } from 'angular2/core';
import {CORE_DIRECTIVES, NgControl, ControlValueAccessor,} from 'angular2/common';
import {Http} from 'angular2/http';

import {Dropdown, InputOption} from '../dropdown/dropdown'
import {Verify} from "../../../../../api/validation/Verify";
import {ApiRoot} from "../../../../../api/persistence/ApiRoot";
import {Observer} from "rxjs/Observer";
import {isBlank} from "angular2/src/facade/lang";

@Component({
  selector: 'cw-input-rest-dropdown',
  directives: [CORE_DIRECTIVES, Dropdown, InputOption],
  template: `
  <cw-input-dropdown 
      [value]="_modelValue"
      placeholder="{{placeholder}}"
      (change)="fireChange($event)"
      (touch)="fireTouch($event)"
      >
        <cw-input-option *ngFor="#opt of _options | async" [value]="opt.value" [label]="opt.label" [icon]="opt.icon"></cw-input-option>
      </cw-input-dropdown>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestDropdown implements AfterViewInit, ControlValueAccessor {

  @Input() placeholder:string
  @Input() allowAdditions:boolean
  @Input() minSelections:number
  @Input() maxSelections:number
  @Input() optionUrl:string
  @Input() optionValueField:string
  @Input() optionLabelField:string

  @Output() change:EventEmitter<any> = new EventEmitter()
  @Output() touch:EventEmitter<any> = new EventEmitter()

  private _modelValue:string
  private _options:Observer<any>

  onChange:Function = (  ) => { }
  onTouched:Function = (  ) => { }

  constructor(private _http:Http, private _apiRoot: ApiRoot, @Optional() public control:NgControl) {
    if(control){
      control.valueAccessor = this;
    }

    this.placeholder = ""
    this.optionValueField = "key"
    this.optionLabelField = "value"
    this.allowAdditions = false
    this.minSelections = 0
    this.maxSelections = 1
  }

  ngAfterViewInit(){
  }

  writeValue(value:any) {
    this._modelValue = isBlank(value) ? '' : value
  }

  registerOnChange(fn) {
    this.onChange = fn;
  }

  registerOnTouched(fn) {
    this.onTouched = fn;
  }

  fireChange($event){
    this.change.emit($event)
    this.onChange($event)
  }

  fireTouch($event){
    this.touch.emit($event)
    this.onTouched($event)
  }

  ngOnChanges(change) {
    if (change.optionUrl) {
      let requestOptionArgs = this._apiRoot.getDefaultRequestOptions()
      this._options = this._http.get(change.optionUrl.currentValue, requestOptionArgs)
          .map((res:any)=> this.jsonEntriesToOptions(res))
    }
  }

  private jsonEntriesToOptions(res:any) {
    let valuesJson = res.json()
    let ary = []
    if (Verify.isArray(valuesJson)) {
      ary = valuesJson.map(valueJson => this.jsonEntryToOption(valueJson))
    } else {
      ary = Object.keys(valuesJson).map((key) => {
        return this.jsonEntryToOption(valuesJson[key], key)
      })
    }
    return ary
  };

  private jsonEntryToOption(json:any, key:string = null):{value:string, label:string} {
    let opt = {value: null, label: null}
    if (!json[this.optionValueField] && this.optionValueField === 'key' && key != null) {
      opt.value = key
    } else {
      opt.value = json[this.optionValueField]
    }
    opt.label = json[this.optionLabelField]
    return opt
  }

}


