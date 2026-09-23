import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TailorsService } from '../tailors/tailors.service';
import { AiService } from './ai.service';
import {
  ClassifyDesignDto,
  DescribeImageDto,
  ExtractMeasurementsDto,
  SummarizeNotesDto,
} from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly ai: AiService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Post('describe-image')
  async describeImage(
    @CurrentUser() user: AuthedUser,
    @Body() body: DescribeImageDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.ai.describeImage(tailorId, body.storagePath, body.mode);
  }

  @Post('extract-measurements')
  async extractMeasurements(
    @CurrentUser() user: AuthedUser,
    @Body() body: ExtractMeasurementsDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    // The measurement scan is the premium one; describing a design photo and
    // tidying notes stay free, because they are part of everyday flows.
    await this.subscriptions.requireFeature(tailorId, 'ai_measurement_scan');
    return this.ai.extractMeasurements(tailorId, body.storagePath, body.mode);
  }

  /**
   * Propose how to file a design photo for the feed.
   *
   * Tenant-scoped through the same storagePath prefix check every other image
   * route uses, so a tailor can only classify their own photo.
   */
  @Post('classify-design')
  async classifyDesign(
    @CurrentUser() user: AuthedUser,
    @Body() body: ClassifyDesignDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    if (body.storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException('storagePath does not belong to this tailor.');
    }
    return this.ai.classifyDesign(body.storagePath, body.bucket, {
      caption: body.caption,
      garmentType: body.garmentType,
    });
  }

  @Post('summarize-notes')
  async summarizeNotes(
    @CurrentUser() user: AuthedUser,
    @Body() body: SummarizeNotesDto,
  ) {
    // requireTailorId gates the endpoint to a real tailor account (same as
    // describe-image); the summary itself only needs the notes text.
    await this.tailors.requireTailorId(user.id);
    return this.ai.summarizeNotes(body.notes);
  }
}
