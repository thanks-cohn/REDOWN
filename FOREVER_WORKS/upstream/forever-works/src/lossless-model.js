import {Model} from './model.js';
import {canonicalLossless} from './lossless-json.js';
import {compare} from './canonical.js';
export * from './lossless-json.js';
export class LosslessModel extends Model {
  constructor(manifest,records,documents){super(manifest,records);this.documents=Object.freeze(documents);}
  normalized(){return canonicalLossless({...this.manifest,records:[...this.records].sort((a,b)=>compare(a.id,b.id))});}
  sourceDocuments(){return this.documents;}
}
