
export default class Application {

    protected name: string;
    protected applicationType: string;
    protected technology: string;
    
    constructor(name: string, applicationType: string, technology: string) {
        this.name = name;
        this.applicationType = applicationType;
        this.technology = technology;
    }

}