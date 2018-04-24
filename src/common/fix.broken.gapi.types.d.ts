/*
For some reason the @types.client.sheets is broken and doesn't include this declaration...
 */
declare namespace gapi {
    namespace client {
        const sheets: any;
    }
}