import assert from 'node:assert/strict';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {SurfaceRenderer,useCustomization} from '@customitin/react';
import {PersonalizationRoot} from '../personalize/root';

function Workspace(){
  const {runtime,registry,loading,diagnostics}=useCustomization();
  assert.deepEqual(diagnostics,[]);
  const descriptor=registry.components.find(c=>c.collection)!;
  const sourceId=descriptor.collection!.sourceId;
  const fields=Object.keys(descriptor.dataInputs!.items!.fields);
  return <><button disabled={loading} onClick={()=>runtime.previewOperations([
    {op:'setDataView',surfaceId:'sdk-collection',view:{id:'cards',title:'Cards',plan:{sourceId,joins:[],computed:{},groupBy:[],aggregates:{},sort:[],project:fields,execution:'local'}}},
    {op:'setSurfaceLayout',surfaceId:'sdk-collection',nodes:[{id:'cards',componentId:descriptor.id,props:{title:'Cards',groupBy:'label',filterBy:'label',sortBy:'value',columns:3},children:[],data:{items:{viewId:'cards',mapping:Object.fromEntries(fields.map(f=>[f,f]))}}}]},
  ],'Show cards','sdk-collection')}>Compose cards</button><SurfaceRenderer id="sdk-collection" preview status={({code})=><p>{code}</p>}/></>;
}
export async function run(){
  render(<PersonalizationRoot><Workspace/></PersonalizationRoot>);
  await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Compose cards'}).hasAttribute('disabled'),false));
  fireEvent.click(screen.getByRole('button',{name:'Compose cards'}));
  await screen.findByText('Host card: Alpha 2');
  assert(screen.getByText('(2)'));
  fireEvent.click(screen.getAllByRole('button',{name:'Beta',exact:true})[0]!);
  assert.equal(screen.queryByText('Host card: Alpha 2'),null);
  assert(screen.getByText('Host card: Beta 10'));
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
  assert(screen.getByText('Host card: Alpha 2'));
  fireEvent.click(screen.getByRole('button',{name:'Toggle grid density'}));
  cleanup();
  console.log('Packed SDK collection generated binding and controls passed.');
}
