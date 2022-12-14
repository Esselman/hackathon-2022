import { RoleCredentials } from '@ncino/aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export class StatusDynamoClient {
  private documentClient: DocumentClient;
  private statusTableName: string;

  constructor(roleCredentials: RoleCredentials) {
    this.statusTableName = process.env.statusTableName ?? '';

    this.documentClient = new DocumentClient({
      accessKeyId: roleCredentials.AccessKeyId,
      secretAccessKey: roleCredentials.SecretAccessKey,
      sessionToken: roleCredentials.SessionToken
    });
  }

  public async storeStatus(statusInput: StatusInput): Promise<string> {
    const params: DocumentClient.PutItemInput = this.buildStoreStatusesParams(statusInput);
    await this.storeStatuses(params);

    return 'Successfully stored message metadata.';
  }

  private buildStoreStatusesParams(input): DocumentClient.PutItemInput {
    const record: StatusRecord = {
      createTime: new Date().getTime() / 1000,
      message: input.message,
      ownerId: input.ownerId,
      ownerTimeZoneOffset: input.ownerTimeZoneOffset,
      ownerUserName: input.ownerUserName,
      recipientId: input.recipientId,
      reminderId: input.reminderId,
      scheduledTime: input.scheduledTime,
      state: 'pending'
    };

    return {
      TableName: this.statusTableName,
      Item: record
    };
  }

  private async storeStatuses(params: DocumentClient.PutItemInput): Promise<string> {
    this.documentClient.put(params).promise();

    return 'Success';
  }

  public async getStatusesForOwner(ownerId: string): Promise<StatusResponse[]> {
    const params: DocumentClient.QueryInput = this.buildGetStatusesParams(ownerId);

    const res: DocumentClient.QueryOutput = await this.queryStatuses(params);

    return res.Items ? this.buildStatusesResponse(res.Items) : [];
  }

  private buildGetStatusesParams(ownerId: string): DocumentClient.QueryInput {
    return {
      TableName: this.statusTableName,
      KeyConditionExpression: 'ownerId = :ownerId',
      ExpressionAttributeValues: {
        ':ownerId': ownerId
      }
    };
  }

  private async queryStatuses(params: DocumentClient.QueryInput): Promise<DocumentClient.QueryOutput> {
    return await this.documentClient.query(params).promise();
  }

  private buildStatusesResponse(items: DocumentClient.ItemList): StatusResponse[] {
    return items.map((item: any) => {
      return {
        createTime: item.createTime,
        message: item.message,
        ownerUserName: item.ownerUserName,
        scheduledTime: item.scheduledTime,
        state: item.state,
        updateTime: item.updateTime ?? ''
      };
    });
  }

  public async updateStatus(ownerId: string, reminderId: string, newStatus: string): Promise<string> {
    const params: DocumentClient.UpdateItemInput = {
      TableName: this.statusTableName,
      Key: {
        ownerId,
        reminderId
      },
      UpdateExpression: 'set state=:state',
      ExpressionAttributeValues: {
        ':state': newStatus
      }
    };

    this.updateStatusItem(params);

    return 'Status updated';
  }

  private async updateStatusItem(params: DocumentClient.UpdateItemInput): Promise<DocumentClient.UpdateItemOutput> {
    return await this.documentClient.update(params).promise();
  }
}

export interface StatusInput {
  message: string;
  ownerId: string;
  ownerTimeZoneOffset: number;
  ownerUserName: string;
  recipientId: string;
  reminderId: string;
  scheduledTime: number;
}

interface StatusRecord {
  createTime: number;
  message: string;
  ownerId: string;
  ownerTimeZoneOffset: number;
  ownerUserName: string;
  recipientId: string;
  reminderId: string;
  scheduledTime: number;
  state: string;
}

export interface StatusResponse {
  createTime: number;
  message: string;
  ownerUserName: string;
  scheduledTime: number;
  state: string;
}
