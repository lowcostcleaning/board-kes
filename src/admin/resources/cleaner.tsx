import { Resource } from 'react-admin';
import CleanerList from './CleanerList'; // Assuming CleanerList exists
import CleanerEdit from '../components/CleanerEdit';

export const CleanerResource = (
  <Resource
    name="users" // Assuming 'users' is the resource name for profiles/cleaners
    list={CleanerList}
    edit={CleanerEdit}
    // You might need to define show and create views as well
  />
);