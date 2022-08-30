import { StatusDynamoClient, StatusResponse } from './dynamo-client';
import { RoleCredentials } from '@ncino/aws-sdk';

export async function listMyStatuses(roleCredentials: RoleCredentials, ownerId: string): Promise<StatusResponse[]> {
  const dynamoClient: StatusDynamoClient = new StatusDynamoClient(roleCredentials);

  return await dynamoClient.getStatusesForOwner(ownerId);
}
