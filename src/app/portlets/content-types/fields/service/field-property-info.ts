import {
    CategoriesPropertyComponent,
    DataTypePropertyComponent,
    DefaultValuePropertyComponent,
    HintPropertyComponent,
    CheckboxPropertyComponent,
    NamePropertyComponent,
    RegexCheckPropertyComponent,
    ValuesPropertyComponent
} from '../content-type-fields-properties-form/field-properties';
import { Validators } from '@angular/forms';
import { validateDateDefaultValue } from './validators';

export const PROPERTY_INFO = {
    categories: {
        component: CategoriesPropertyComponent,
        defaultValue: '',
        order: 2,
        validations: [Validators.required]
    },
    dataType: {
        component: DataTypePropertyComponent,
        defaultValue: '',
        order: 1,
        disabledInEdit: true
    },
    defaultValue: {
        component: DefaultValuePropertyComponent,
        defaultValue: '',
        order: 4,
        validations: [validateDateDefaultValue]
    },
    hint: {
        component: HintPropertyComponent,
        defaultValue: '',
        order: 5
    },
    indexed: {
        component: CheckboxPropertyComponent,
        defaultValue: false,
        order: 9
    },
    listed: {
        component: CheckboxPropertyComponent,
        defaultValue: false,
        order: 10
    },
    name: {
        component: NamePropertyComponent,
        defaultValue: '',
        order: 0,
        validations: [Validators.required],
        disabledInFixed: true
    },
    regexCheck: {
        component: RegexCheckPropertyComponent,
        defaultValue: '',
        order: 6
    },
    required: {
        component: CheckboxPropertyComponent,
        defaultValue: false,
        order: 7
    },
    searchable: {
        component: CheckboxPropertyComponent,
        defaultValue: false,
        order: 8
    },
    unique: {
        component: CheckboxPropertyComponent,
        defaultValue: false,
        order: 11
    },
    values: {
        component: ValuesPropertyComponent,
        defaultValue: '',
        order: 3,
        validations: [Validators.required]
    }
};
