export type EmployeeDetails = {id:string;name:string;email:string};

export function EmployeeFields({employee}:{employee:EmployeeDetails}){
 return <fieldset className="employee-details"><legend>Employee making this change</legend><div className="form-grid"><label>Employee ID<input type="text" value={employee.id} readOnly autoComplete="off"/></label><label>Employee name<input type="text" value={employee.name} readOnly autoComplete="off"/></label><label className="span-2">Work email<input type="email" value={employee.email} readOnly autoComplete="off"/></label></div><p className="help">Filled automatically from your signed-in account. This change will be recorded under your employee ID.</p></fieldset>;
}
