import { Component, ViewEncapsulation } from '@angular/core';
import { HttpRequestUtils, LoginService, LoggerService, HttpCode, ResponseView, User } from 'dotcms-js/dotcms-js';
import { DotRouterService } from '../../../../api/services/dot-router/dot-router.service';
import { DotLoadingIndicatorService } from '../../_common/iframe/dot-loading-indicator/dot-loading-indicator.service';

@Component({
    encapsulation: ViewEncapsulation.Emulated,
    providers: [HttpRequestUtils],
    selector: 'dot-login-container',
    template: `
        <dot-login-component
            [message]="message"
            [isLoginInProgress]="isLoginInProgress"
            (login)="logInUser($event)"
            (recoverPassword)="showForgotPassword()"
            [passwordChanged]="passwordChanged"
            [resetEmailSent]="resetEmailSent"
            [resetEmail]="resetEmail"
        >
        </dot-login-component>
    `
})
export class LoginContainerComponent {
    public isLoginInProgress = false;
    public message: string;
    public passwordChanged = false;
    public resetEmail = '';
    public resetEmailSent = false;

    constructor(
        private dotRouterService: DotRouterService,
        private httprequestUtils: HttpRequestUtils,
        private loggerService: LoggerService,
        private loginService: LoginService,
        private dotLoadingIndicatorService: DotLoadingIndicatorService
    ) {
        // this.dotLoadingIndicatorService.hide();
        // TODO: change the httpRequestUtils.getQueryParams() with an NG2 method equivalent to QueryParams on NGRX.
        const queryParams: Map<string, any> = this.httprequestUtils.getQueryParams();
        if (<boolean>queryParams.get('changedPassword')) {
            this.passwordChanged = queryParams.get('changedPassword');
        } else if (<boolean>queryParams.get('resetEmailSent')) {
            this.resetEmailSent = queryParams.get('resetEmailSent');
            this.resetEmail = decodeURIComponent(queryParams.get('resetEmail'));
        }
    }

    logInUser(loginData: LoginData): void {
        this.isLoginInProgress = true;
        this.dotLoadingIndicatorService.show();
        this.message = '';

        this.loginService.loginUser(loginData.login, loginData.password, loginData.rememberMe, loginData.language).subscribe(
            (user: User) => {
                this.message = '';
                this.dotLoadingIndicatorService.hide();
                this.dotRouterService.goToMain(user['editModeUrl']);
            },
            (error: ResponseView) => {
                if (this.isBadRequestOrUnathorized(error.status)) {
                    this.message = error.errorsMessages || this.getErrorMessage(error.response.json().error);
                } else {
                    this.loggerService.debug(error);
                }
                this.isLoginInProgress = false;
                this.dotLoadingIndicatorService.hide();
            }
        );
    }

    /**
     * Display the forgot password card
     */
    showForgotPassword(): void {
        this.dotRouterService.goToForgotPassword();
    }

    private getErrorMessage(origMessage: string): string {
        const split = origMessage.split(':');
        return split[2];
    }

    private isBadRequestOrUnathorized(status: number) {
        return status === HttpCode.BAD_REQUEST || status === HttpCode.UNAUTHORIZED;
    }
}

export interface LoginData {
    login: string;
    password: string;
    rememberMe: boolean;
    language: string;
}
