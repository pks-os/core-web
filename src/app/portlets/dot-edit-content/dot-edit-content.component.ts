import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FAKE_EDIT_PAGE_HTML } from './fake-edit-page-html';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { DotContainerContentletService } from './services/dot-container-contentlet.service';
import { EDIT_PAGE_CSS } from './iframe-edit-mode.css';

@Component({
    selector: 'dot-edit-content',
    templateUrl: './dot-edit-content.component.html',
    styleUrls: ['./dot-edit-content.component.scss']
})
export class DotEditContentComponent implements OnInit {
    @ViewChild('iframe') iframe: ElementRef;
    @ViewChild('editContentIframe') editContentIframe: ElementRef;

    dialogTitle: string;
    editContentUrl: SafeResourceUrl;
    editContentletEvents: BehaviorSubject<any> = new BehaviorSubject({});
    model: BehaviorSubject<any> = new BehaviorSubject(null);
    relocateContentlet: BehaviorSubject<any> = new BehaviorSubject(null);
    source: any;

    constructor(
        private sanitizer: DomSanitizer,
        private ref: ChangeDetectorRef,
        private dotContainerContentletService: DotContainerContentletService
    ) {}

    ngOnInit() {
        const iframeEl = this.getEditPageIframe();
        iframeEl.addEventListener('load', () => this.setEditMode());
        iframeEl.contentWindow.model = this.model;
        iframeEl.contentWindow.relocateContentlet = this.relocateContentlet;

        this.loadCodeIntoIframe();

        this.model.subscribe(res => {
            this.ref.detectChanges();
        });

        this.relocateContentlet.subscribe(res => {
            if (res) {
                this.renderRelocatedContentlet(res);
            }
        });

        this.editContentletEvents.subscribe(res => {
            console.log(res);

            if (res.event === 'cancel') {
                this.dialogTitle = null;
                this.editContentUrl = null;
            }

            if (res.event === 'save') {
                this.dialogTitle = null;
                this.editContentUrl = null;
                this.renderRelocatedContentlet({
                    contentlet: {
                        inode: '5aef0c62' || res.contentletInode
                    }
                });
            }

            /*
                I think because we are triggering the .next() from the jsp the Angular detect changes it's not
                happenning automatically, so I have to triggered manually so the changes propagates to the template
            */
            this.ref.detectChanges();
        });
    }

    onHide(): void {
        this.dialogTitle = null;
        this.editContentUrl = null;
    }

    private addContentlet($event): void {
        console.log('Add contenlet to container', $event.target.dataset.identifier);
    }

    private bindContainersEvents(): void {
        this.bindAddContentletEvents();
    }

    private bindAddContentletEvents(): void {
        const addButtons = this.getEditPageDocument().querySelectorAll('.dotedit-container__add');

        addButtons.forEach(button => {
            button.addEventListener('click', $event => {
                this.addContentlet($event);
            });
        });
    }

    private bindContenletsEvents(): void {
        this.bindEditContentletEvents();
        this.bindRemoveContentletEvents();
    }

    private bindEditContentletEvents(): void {
        const editButtons = this.getEditPageDocument().querySelectorAll('.dotedit-contentlet__edit');

        editButtons.forEach(button => {
            button.addEventListener('click', $event => {
                this.editContentlet($event);
            });
        });
    }

    private bindRemoveContentletEvents(): void {
        const editButtons = this.getEditPageDocument().querySelectorAll('.dotedit-contentlet__remove');

        editButtons.forEach(button => {
            button.addEventListener('click', $event => {
                this.removeContentlet($event);
            });
        });
    }

    private editContentlet($event): void {
        const id = $event.target.dataset.identifier;

        this.dialogTitle = `Editing content with id ${id}`;
        this.editContentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            // tslint:disable-next-line:max-line-length
            '/c/portal/layout?p_l_id=71b8a1ca-37b6-4b6e-a43b-c7482f28db6c&p_p_id=content&p_p_action=1&p_p_state=maximized&p_p_mode=view&_content_struts_action=%2Fext%2Fcontentlet%2Fedit_contentlet&_content_cmd=edit&inode=aaee9776-8fb7-4501-8048-844912a20405&referer=%2Fc%2Fportal%2Flayout%3Fp_l_id%3D71b8a1ca-37b6-4b6e-a43b-c7482f28db6c%26p_p_id%3Dcontent%26p_p_action%3D1%26p_p_state%3Dmaximized%26_content_struts_action%3D%2Fext%2Fcontentlet%2Fview_contentlets'
        );

        /*
            Again, because the click event it's comming form the iframe, we need to trigger the detect changes manually.
        */
        this.ref.detectChanges();

        /*
            We have an ngIf in the <iframe> to prevent the jsp to load before the dialog shows, so we need to wait that
            element it's available in the DOM
        */
        setTimeout(() => {
            const editContentletIframeEl = this.editContentIframe.nativeElement;

            /*
                TODO: should I remove this listener when when the dialog closes?
            */
            editContentletIframeEl.addEventListener('load', () => {
                editContentletIframeEl.contentWindow.ngEditContentletEvents = this.editContentletEvents;
            });
        }, 0);
    }

    private getDragAndDropCss(): any {
        const dragulaCss = this.getEditPageDocument().createElement('link');
        dragulaCss.rel = 'stylesheet';
        dragulaCss.type = 'text/css';
        dragulaCss.media = 'all';
        dragulaCss.href = '//bevacqua.github.io/dragula/dist/dragula.css';

        return dragulaCss;
    }

    private getDragAndDropScript(): any {
        const doc = this.getEditPageDocument();

        const script = doc.createElement('script');

        script.type = 'text/javascript';
        script.src = '//bevacqua.github.io/dragula/dist/dragula.js';
        script.onload = function() {
            const dragAndDropScript = doc.createElement('script');
            dragAndDropScript.type = 'text/javascript';
            dragAndDropScript.text = `
                var containers = Array.from(document.getElementsByTagName('dotedit-container'));

                function getModel() {
                    var model = {};
                    containers.forEach(function(container) {
                        var contentlets = Array.from(container.querySelectorAll('dotedit-contentlet'));

                        model[container.dataset.identifier] = contentlets.map(function(contentlet) {
                            return contentlet.dataset.identifier
                        })
                    })

                    return model;
                }

                var forbiddenTarget;

                var drake = dragula(
                    containers, {
                    accepts: function (el, target, source, sibling) {
                        var canDrop = target.dataset.acceptTypes.indexOf(el.dataset.type) > -1;

                        if (target.dataset.maxLimit) {
                            var containerMaxLimit = parseInt(target.dataset.maxLimit, 10);
                            var containerChildrenQuantity = target.children.length

                            canDrop = containerChildrenQuantity < containerMaxLimit;
                        }

                        if (!canDrop && target !== source) {
                            forbiddenTarget = target;
                            forbiddenTarget.classList.add('no')
                        }

                        return canDrop;
                    },
                });

                drake.on('dragend', function(el) {
                    if (forbiddenTarget && forbiddenTarget.classList.contains('no')) {
                        forbiddenTarget.classList.remove('no');
                    }

                    window.model.next(getModel());
                });

                drake.on('drop', function(el, target, source, sibling) {
                    if (target !== source) {
                        window.relocateContentlet.next({
                            container: target.dataset.identifier,
                            contentlet: {
                                identifier: el.dataset.identifier,
                                inode: el.dataset.inode
                            }
                        });
                    }
                })

                // Init the model
                window.model.next(getModel());
            `;
            doc.body.appendChild(dragAndDropScript);
        };

        return script;
    }

    private getEditPageDocument(): any {
        return this.getEditPageIframe().contentDocument || this.getEditPageIframe().contentWindow.document;
    }

    private getEditPageIframe(): any {
        return this.iframe.nativeElement;
    }

    private initDragAndDropContentlets(): void {
        const doc = this.getEditPageDocument();
        doc.head.appendChild(this.getDragAndDropCss());
        doc.body.appendChild(this.getDragAndDropScript());
    }

    private loadCodeIntoIframe(): void {
        const doc = this.getEditPageDocument();
        doc.open();
        doc.write(FAKE_EDIT_PAGE_HTML);
        doc.close();
    }

    private renderRelocatedContentlet(relocateInfo: any): void {
        console.log(relocateInfo);
        const doc = this.getEditPageDocument();

        const contenletEl = doc.querySelector(`dotedit-contentlet[data-inode="${relocateInfo.contentlet.inode}"]`);
        console.log(contenletEl);

        const contentletContentEl = contenletEl.querySelector('.dotedit-contentlet__content');

        contentletContentEl.innerHTML += '<div class="loader__overlay"><div class="loader"></div></div>';

        relocateInfo.container = relocateInfo.container || contenletEl.parentNode.dataset.identifier;

        this.dotContainerContentletService.getContentletToContainer(
            relocateInfo.container,
            relocateInfo.contentlet
        ).subscribe(contentletHtml => {
            const div = doc.createElement('div');
            div.innerHTML = contentletHtml;

            contentletContentEl.innerHTML = '';

            // TODO: need to come up with a more efficient way to do this
            Array.from(div.children).forEach((node: any) => {
                if (node.tagName === 'SCRIPT') {
                    const script = doc.createElement('script');
                    script.type = 'text/javascript';

                    if (node.src) {
                        script.src = node.src;
                    } else {
                        script.text = node.textContent;
                    }

                    contentletContentEl.appendChild(script);
                } else {
                    contentletContentEl.appendChild(node);
                }
            });
        });
    }

    private removeContentlet($event): void {
        console.log('Remove contenlet', $event.target.dataset.identifier);
    }

    private setEditContentletStyles(): void {
        const doc = this.getEditPageDocument();
        const style = doc.createElement('style');
        style.type = 'text/css';

        if (style.styleSheet) {
            style.styleSheet.cssText = EDIT_PAGE_CSS;
        } else {
            style.appendChild(document.createTextNode(EDIT_PAGE_CSS));
        }

        doc.head.appendChild(style);
    }

    private setEditMode(): void {
        this.bindContenletsEvents();
        this.bindContainersEvents();

        this.initDragAndDropContentlets();
        this.setEditContentletStyles();
    }
}