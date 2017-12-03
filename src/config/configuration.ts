export interface IConfiguration {
    graphcool_uri: string;
    graphcool_connectToDevTools: boolean;
}

export const defaultConfiguration: IConfiguration = {
    graphcool_uri: "https://api.graph.cool/simple/v1/cjannijk90slv0145gtu44uv5",
    graphcool_connectToDevTools: false
};
