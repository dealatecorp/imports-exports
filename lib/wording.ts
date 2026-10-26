// Display wording only. Keep stored statuses and submitted values unchanged.
const values:Record<string,string>={Available:'Ready to use',Reserved:'Set aside for an order',Staged:'Moved to loading area',Loaded:'Loaded in container',Blocked:'On hold',Dispatched:'Sent',Departed:'Left the port','In Transit':'On the way',Handover:'Handed over',Partial:'Partly completed',Pending:'Waiting for approval',Open:'Needs attention',Acknowledged:'Seen',Escalated:'Needs urgent attention',Quarantined:'Waiting for safety check',Clean:'Safety check passed',FCL:'Full container',LCL:'Shared container',Reefer:'Refrigerated container',true:'Yes',false:'No',export:'Export (sending goods)',import:'Import (receiving goods)',timezone:'Time zone',staleHours:'Hours before a tracking update is overdue',requireStaging:'Move items to loading area before loading',requiredDocuments:'Documents required before sending'};
export function displayValue(value:unknown){const text=String(value??'—');return values[text]||text;}
const labels:Record<string,string>={cargo_group:'Container item group',ref:'Name',product_name:'Item',name:'Name',sku:'Product code',items:'Items and quantities',order_ref:'Order',shipment_ref:'Shipment',container:'Container',party:'Supplier / customer',eta:'Expected arrival',original_eta:'Original expected arrival',carrier:'Shipping company',vessel:'Ship name',voyage:'Trip number',kind:'Type',origin:'Starting port',destination:'Destination',departure:'Leaving date',due:'Needed by',direction:'Sending / receiving',lot:'Batch number',state:'Stock status',delta:'Quantity change',id:'Record number',reserved:'Set aside',staged:'In loading area',loaded:'Loaded',dispatched:'Sent',blocked:'On hold',expected:'Expected quantity',counted:'Counted quantity',accepted:'Accepted',closed:'No longer expected',outstanding:'Still needed',precision:'Decimal places allowed',lot_enabled:'Track batches',archived:'No longer in use',event_time:'Update time',source_name:'From location',destination_name:'To location',scan:'File safety check',actor_name:'Changed by',entity:'Affected record',detail:'Details',active:'Account enabled',mfa_enabled:'Extra sign-in protection',source:'Update source'};
export function fieldLabel(key:string){return labels[key]||key.replaceAll('_',' ');}
export const actionHelp:Record<string,string>={
 'add-stock':'Choose an existing item and its storage location. Enter only the extra quantity being added, not the new total. Stock becomes available immediately. For items belonging to an incoming order, use Receive items in that order to avoid counting them twice.',
 'receive-order':'Check the item list and quantities shown on the page before confirming. This completes the order. For incoming goods, remaining quantities are added to warehouse stock once. For outgoing goods, this confirms delivery without adding warehouse stock. If anything is missing or damaged, cancel and record the actual quantities in the order instead.',
 count:'Enter the quantity you physically counted. A manager must approve it before the stock total changes.',
 transfer:'Move available items from one storage location to another. Moves between warehouses must be confirmed when received.',
 'opening-import':'Add starting stock from a spreadsheet saved as CSV. Use this for initial quantities, not to replace existing stock totals.',
 'delete-order':'Only managers can delete orders. This removes the order from active lists. Its stock records and change history are retained. Orders with unfinished stock handling must be resolved first.',
 allocate:'Choose an order item, a container and a quantity. Incompatible items, such as vegetables and fish, must use separate containers. For exports, these items are set aside in stock. For imports, this records what you expect to receive. Repeat for other items or containers.',
 stage:'Confirm that the items have been moved to the loading area. They are not loaded into the container yet.',
 load:'Confirm how many items have actually been loaded into the container.',
 unload:'Record items physically removed from the container before it was sent. Enter the quantity and reason. The app automatically matches the loading records and returns the items to their previous stock status.',
 receive:'Enter the quantities actually received. Put damaged items or items waiting for inspection on hold.',
 inspect:'Confirm that these items have passed inspection and can be used.',
 dispatch:'Confirm that the shipment has left the warehouse. All items must be loaded and the required documents must pass their safety checks.',
 'dispatch-correction':'Use this only when the shipment was marked as sent by mistake and the goods never left the warehouse.',
 'cancel-allocation':'Remove this item assignment and release stock set aside for it. Loaded items must be physically unloaded first.',
 tracking:'Add a confirmed location and progress update. These updates are entered by your team; this is not live GPS tracking.',
 return:'Record goods that have physically returned and been inspected. They will be placed on hold for review.',
 resolve:'Record how the missing, extra or damaged items were handled. The original receiving record stays in the history.',
};

const errors:Record<string,string>={
 'Allocation not found':'The item assignment could not be found.',
 'Allocation exceeds remaining order quantity':'This quantity is more than the order still needs. Check the items already assigned to containers.',
 'Allocation or shipment cancelled':'This item assignment or shipment has been cancelled.',
 'Stage the allocation before loading':'Move these items to the loading area before loading them into the container.',
 'Quantity exceeds this allocation state':'There are not enough items in the selected stock status. Check the quantity and try again.',
 'Only inbound allocations can be received':'Only items assigned to an import shipment can be received here.',
 'Select the original loading movement':'Enter the original loading record number from Stock history.',
 'Unload exceeds unreversed loading quantity':'You cannot unload more items than are still loaded.',
 'Cancel unshipped allocations first':'Remove the items assigned to this shipment before cancelling it.',
 'Every manifest line must be fully loaded with package count; split quantities into separate allocations':'Load all assigned items and enter the number of packages before sending. If only some items are ready, assign the remaining items to another container.',
 'Insufficient eligible stock or quantity conflict; refresh and retry':'There is not enough available stock, or the quantity has changed. Refresh and check the latest stock.',
 'Unknown SKU':'Product code not found.',
 'Open discrepancy required':'Select a receiving issue that is still open.',
 'Lot tracking is not enabled':'Batch tracking is not enabled for this item.',
 'Select a registered lot for this product':'Choose a batch number already added for this item.',
 'This product does not use lots':'This item does not use batch numbers.',
};
export function errorText(text:string){return errors[text]||text;}
