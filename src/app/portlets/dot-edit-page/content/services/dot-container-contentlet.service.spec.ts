import { MockBackend } from '@angular/http/testing';
import { ConnectionBackend } from '@angular/http';
import { DotContainerContentletService } from './dot-container-contentlet.service';
import { ReflectiveInjector } from '@angular/core';
import { MockConnection } from '@angular/http/testing';
import { DOTTestBed } from '../../../../test/dot-test-bed';
import { tick } from '@angular/core/testing';
import { fakeAsync } from '@angular/core/testing';
import { DotPageContainer } from '../../../dot-edit-page/shared/models/dot-page-container.model';
import { DotPageContent } from '../../../dot-edit-page/shared/models/dot-page-content.model';
import { ContentType } from '../../../content-types/shared/content-type.model';

describe('DotContainerContentletService', () => {
    let dotContainerContentletService: DotContainerContentletService;
    let backend: MockBackend;
    let lastConnection: any;

    beforeEach(() => {
        const injector: ReflectiveInjector = DOTTestBed.resolveAndCreate([DotContainerContentletService]);

        dotContainerContentletService = injector.get(DotContainerContentletService);
        backend = injector.get(ConnectionBackend);
        backend.connections.subscribe((connection: MockConnection) => (lastConnection = connection));
    });

    it(
        'should do a request for get the contentlet html code',
        fakeAsync(() => {
            const contentletId = '2';
            const pageContainer: DotPageContainer = {
                identifier: '1',
                uuid: '3'
            };

            const pageContent: DotPageContent = {
                identifier: '2',
                inode: '4',
                type: 'content_type'
            };

            let response;

            dotContainerContentletService
                .getContentletToContainer(pageContainer, pageContent)
                .subscribe((resp) => (response = resp));

            tick();
            expect(lastConnection.request.url).toContain(
                `v1/containers/${pageContainer.identifier}/content/${contentletId}`
            );
        })
    );

    it('should do a request for get the form html code',
        fakeAsync(() => {
            const formId = '2';
            const pageContainer: DotPageContainer = {
                identifier: '1',
                uuid: '3'
            };

            const form: ContentType = {
                clazz: 'clazz',
                defaultType: true,
                fixed: true,
                folder: 'folder',
                host: 'host',
                name: 'name',
                owner: 'owner',
                system: false,
                baseType: 'form',
                id: formId
            };

            let response;

            dotContainerContentletService
                .getFormToContainer(pageContainer, form)
                .subscribe((resp) => (response = resp));

            tick();
            expect(lastConnection.request.url).toContain(
                `v1/containers/${pageContainer.identifier}/form/${formId}`
            );
        })
    );
});
