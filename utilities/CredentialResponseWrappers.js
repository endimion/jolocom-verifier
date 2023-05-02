function wrapPalaemonCredential(credential) {
  /*
            {
              id: 'did:jun:Et5cGlSsRwGx-OLGvsrV3nwdHP5TE5Qmlq5lj7Bu3ByA',
              age: '1965-01-01',
              crewMember: 'false',
              gender: 'Male',
              medical_conditions: 'none',
              name: 'CLAUDE',
              role: 'passenger',
              surname: 'PHIL',
              ticketNumber: '123'
            }

            */

  let response = {};
  response["id"] = credential.id;
  response["palaemon_name"] = credential.name;
  response["palaemon_surname"] = credential.surname;
  response["palaemon_gender"] = credential.gender;
  response["palaemon_age"] = credential.age;
  response["palaemon_ticket_number"] = credential.ticketNumber;
  response["palaemon_medical_condition"] = credential.medical;
  response["palaemon_role"] = credential.role;
  response["palaemon_crew"] = credential.crewMember;
  response["palaemon_eid"] = credential.identifier;

  return response;
}

export { wrapPalaemonCredential };
