import React from 'react';
import { Edit, SimpleForm, TextInput, SelectInput, ReferenceInput, AutocompleteArrayInput, required, useRecordController } from 'react-admin';
import { ReferenceManyToManyInput } from '@react-admin/ra-relationships';

const CleanerEdit = (props: any) => {
  // Fetch cleaner data to get cleaner_id for ReferenceManyToManyInput
  const { record } = useRecordController(props);

  return (
    <Edit {...props}>
      <SimpleForm>
        <TextInput source="name" label="Name" validate={required()} />
        <TextInput source="email" label="Email" validate={required()} disabled />
        
        {/* ReferenceManyToManyInput for assigning complexes */}
        {record && (
          <ReferenceManyToManyInput
            reference="residential_complexes" // The resource for residential complexes
            through="cleaner_complexes"       // The junction table
            using="cleaner_id,complex_id"     // Foreign keys in the junction table
            source="id"                       // Source ID from the cleaner record
            label="Assigned Complexes"
            disabled={props.disabled} // Pass disabled prop down
          >
            <AutocompleteArrayInput
              optionText="name" // Display the name of the complex
              label="Select Complexes"
              disabled={props.disabled}
            />
          </ReferenceManyToManyInput>
        )}
      </SimpleForm>
    </Edit>
  );
};

export default CleanerEdit;