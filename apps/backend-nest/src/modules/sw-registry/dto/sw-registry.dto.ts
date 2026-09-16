import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStructureElementDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  elementTypeCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateStructureElementDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  elementTypeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class AddStructureResponsibleDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roleCode!: string;
}

export class CreateSwItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  designation!: string;

  @IsUUID()
  elementId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  shortName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fullName!: string;

  @IsUUID()
  partnerId!: string;

  @IsUUID()
  responsibleUserId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  developmentKindCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specUrl?: string | null;
}

export class UpdateSwItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsUUID()
  elementId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shortName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fullName?: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  developmentKindCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specUrl?: string | null;
}

export class ApprovalSheetInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sheetsCount?: number;
}

export const SW_DOCUMENT_FILE_SOURCES = ['svn', 'upload'] as const;

/**
 * Файл создаваемого документа. Один класс с условными проверками по source: вложенные DTO с
 * дискриминатором в проекте не используются, а whitelist вырезал бы поля «чужой» ветки.
 */
export class SwDocumentFileDto {
  @IsString()
  @IsIn(SW_DOCUMENT_FILE_SOURCES)
  source!: (typeof SW_DOCUMENT_FILE_SOURCES)[number];

  /** svn: путь файла внутри репозитория конструкторов. */
  @ValidateIf((o: SwDocumentFileDto) => o.source === 'svn')
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  path?: string;

  /** svn, повтор после конфликта: файл уже перенесён в хранилище под этот документ — второй раз не качаем. */
  @ValidateIf((o: SwDocumentFileDto) => o.source === 'svn' && o.storedFileId != null)
  @IsUUID()
  storedFileId?: string;

  /** Ревизия и UUID репозитория перенесённого файла — из ответа на конфликт. */
  @ValidateIf((o: SwDocumentFileDto) => o.source === 'svn' && o.storedFileId != null)
  @IsInt()
  @Min(1)
  revision?: number;

  @ValidateIf((o: SwDocumentFileDto) => o.source === 'svn' && o.storedFileId != null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  repoUuid?: string;

  /** upload: файл, загруженный браузером по тикету upload-ticket. */
  @ValidateIf((o: SwDocumentFileDto) => o.source === 'upload')
  @IsUUID()
  fileId?: string;

  @ValidateIf((o: SwDocumentFileDto) => o.source === 'upload')
  @IsUUID()
  versionId?: string;

  @ValidateIf((o: SwDocumentFileDto) => o.source === 'upload')
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename?: string;
}

/** Тикет на загрузку файла ещё не созданного документа (id документа резервирует окно). */
export class SwDocumentUploadTicketDto {
  @IsUUID()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contentType?: string;
}

export class CreateSwDocumentDto {
  /** id резервирует окно при открытии: повтор «Создать» после потерянного ответа не плодит дубль. */
  @IsUUID()
  id!: string;

  /** Документ без файла не создаётся. */
  @IsDefined()
  @ValidateNested()
  @Type(() => SwDocumentFileDto)
  file!: SwDocumentFileDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documentKindCode!: string;

  /** Номер задаёт человек или имя файла: автонумерации нет, документы живые. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  kindSequenceNo!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sheetsCount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  letter?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApprovalSheetInputDto)
  approvalSheet?: ApprovalSheetInputDto;
}

export class UpdateSwDocumentDto {
  /** Вид и номер у живого документа меняются; без обозначения оно пересобирается из них. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documentKindCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  kindSequenceNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sheetsCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  letter?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApprovalSheetInputDto)
  approvalSheet?: ApprovalSheetInputDto | null;
}

export class SwIpsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id!: string;

  @IsString()
  @IsNotEmpty()
  placedAt!: string;
}

export class ChangeSwDocumentStatusDto {
  @IsIn(['document', 'sheet'])
  scope!: 'document' | 'sheet';

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  statusCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SwIpsDto)
  ips?: SwIpsDto;
}

export class AddSwItemPatentDto {
  @IsUUID()
  patentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null;
}

const SW_FILE_OBJECT_TYPES = ['sw_item', 'sw_document', 'sw_sheet'] as const;
const SW_FILE_PURPOSES = ['document', 'sheet', 'spec'] as const;

export class SwFileTicketDto {
  @IsString()
  @IsIn(SW_FILE_OBJECT_TYPES)
  objectType!: (typeof SW_FILE_OBJECT_TYPES)[number];

  @IsUUID()
  objectId!: string;

  @IsString()
  @IsIn(SW_FILE_PURPOSES)
  purpose!: (typeof SW_FILE_PURPOSES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contentType?: string;
}

export class SwFileVersionTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contentType?: string;
}

export class SwFileConfirmDto {
  @IsString()
  @IsIn(SW_FILE_OBJECT_TYPES)
  objectType!: (typeof SW_FILE_OBJECT_TYPES)[number];

  @IsUUID()
  objectId!: string;

  @IsString()
  @IsIn(SW_FILE_PURPOSES)
  purpose!: (typeof SW_FILE_PURPOSES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsOptional()
  @IsUUID()
  versionId?: string;

  /** Замена копии: прежние привязки этой записи снимаются (у документа копия одна). */
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
