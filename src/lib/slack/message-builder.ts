/**
 * Slack Message Builder
 * 
 * A utility for constructing rich Slack messages with blocks and attachments.
 * This builder follows the Block Kit UI framework from Slack.
 * 
 * @see https://api.slack.com/block-kit
 */

// Define types for Slack Block Kit elements
export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

export interface SlackBlock {
  type: string;
  block_id?: string;
  [key: string]: unknown;
}

export interface SlackSectionBlock extends SlackBlock {
  type: 'section';
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  accessory?: SlackBlockElement;
}

export interface SlackDividerBlock extends SlackBlock {
  type: 'divider';
}

export interface SlackImageBlock extends SlackBlock {
  type: 'image';
  image_url: string;
  alt_text: string;
  title?: SlackTextObject;
}

export interface SlackContextBlock extends SlackBlock {
  type: 'context';
  elements: (SlackTextObject | SlackImageElement)[];
}

export interface SlackActionsBlock extends SlackBlock {
  type: 'actions';
  elements: SlackBlockElement[];
}

export interface SlackHeaderBlock extends SlackBlock {
  type: 'header';
  text: SlackTextObject;
}

export interface SlackBlockElement {
  type: string;
  action_id?: string;
  [key: string]: unknown;
}

export interface SlackButtonElement extends SlackBlockElement {
  type: 'button';
  text: SlackTextObject;
  value?: string;
  url?: string;
  style?: 'primary' | 'danger';
  confirm?: SlackConfirmationDialog;
}

export interface SlackImageElement extends SlackBlockElement {
  type: 'image';
  image_url: string;
  alt_text: string;
}

export interface SlackConfirmationDialog {
  title: SlackTextObject;
  text: SlackTextObject;
  confirm: SlackTextObject;
  deny: SlackTextObject;
  style?: 'primary' | 'danger';
}

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  mrkdwn?: boolean;
}

/**
 * Message Builder for creating rich Slack messages
 */
export class SlackMessageBuilder {
  private message: SlackMessage;
  
  /**
   * Create a new message builder
   * @param text - The fallback text for the message (required by Slack)
   */
  constructor(text: string) {
    this.message = {
      text,
      blocks: []
    };
  }
  
  /**
   * Set the channel for the message
   */
  channel(channelId: string): SlackMessageBuilder {
    this.message.channel = channelId;
    return this;
  }
  
  /**
   * Set the thread timestamp to reply in a thread
   */
  thread(threadTs: string, broadcast = false): SlackMessageBuilder {
    this.message.thread_ts = threadTs;
    this.message.reply_broadcast = broadcast;
    return this;
  }
  
  /**
   * Control link unfurling behavior
   */
  unfurl(links = true, media = true): SlackMessageBuilder {
    this.message.unfurl_links = links;
    this.message.unfurl_media = media;
    return this;
  }
  
  /**
   * Enable or disable markdown parsing
   */
  markdown(enabled = true): SlackMessageBuilder {
    this.message.mrkdwn = enabled;
    return this;
  }
  
  /**
   * Create a plain text object
   */
  static plainText(text: string, emoji = true): SlackTextObject {
    return {
      type: 'plain_text',
      text,
      emoji
    };
  }
  
  /**
   * Create a markdown text object
   */
  static mrkdwn(text: string, verbatim = false): SlackTextObject {
    return {
      type: 'mrkdwn',
      text,
      verbatim
    };
  }
  
  /**
   * Add a header block
   */
  addHeader(text: string): SlackMessageBuilder {
    this.message.blocks!.push({
      type: 'header',
      text: SlackMessageBuilder.plainText(text)
    });
    return this;
  }
  
  /**
   * Add a section block with text
   */
  addSection(text: string, markdown = true, blockId?: string): SlackMessageBuilder {
    const section: SlackSectionBlock = {
      type: 'section',
      text: markdown 
        ? SlackMessageBuilder.mrkdwn(text) 
        : SlackMessageBuilder.plainText(text)
    };
    
    if (blockId) {
      section.block_id = blockId;
    }
    
    this.message.blocks!.push(section);
    return this;
  }
  
  /**
   * Add a section with fields
   */
  addFields(fields: string[], markdown = true, blockId?: string): SlackMessageBuilder {
    const section: SlackSectionBlock = {
      type: 'section',
      fields: fields.map(field => 
        markdown 
          ? SlackMessageBuilder.mrkdwn(field) 
          : SlackMessageBuilder.plainText(field)
      )
    };
    
    if (blockId) {
      section.block_id = blockId;
    }
    
    this.message.blocks!.push(section);
    return this;
  }
  
  /**
   * Add a divider
   */
  addDivider(blockId?: string): SlackMessageBuilder {
    const divider: SlackDividerBlock = {
      type: 'divider'
    };
    
    if (blockId) {
      divider.block_id = blockId;
    }
    
    this.message.blocks!.push(divider);
    return this;
  }
  
  /**
   * Add an image block
   */
  addImage(imageUrl: string, altText: string, title?: string, blockId?: string): SlackMessageBuilder {
    const image: SlackImageBlock = {
      type: 'image',
      image_url: imageUrl,
      alt_text: altText
    };
    
    if (title) {
      image.title = SlackMessageBuilder.plainText(title);
    }
    
    if (blockId) {
      image.block_id = blockId;
    }
    
    this.message.blocks!.push(image);
    return this;
  }
  
  /**
   * Add a context block with text and/or images
   */
  addContext(elements: (string | { imageUrl: string, altText: string })[], blockId?: string): SlackMessageBuilder {
    const contextElements = elements.map(element => {
      if (typeof element === 'string') {
        return SlackMessageBuilder.mrkdwn(element);
      } else {
        return {
          type: 'image',
          image_url: element.imageUrl,
          alt_text: element.altText
        };
      }
    });
    
    const context: SlackContextBlock = {
      type: 'context',
      elements: contextElements as (SlackTextObject | SlackImageElement)[]
    };
    
    if (blockId) {
      context.block_id = blockId;
    }
    
    this.message.blocks!.push(context);
    return this;
  }
  
  /**
   * Add an actions block with buttons
   */
  addActions(buttons: {
    text: string;
    actionId: string;
    value?: string;
    url?: string;
    style?: 'primary' | 'danger';
  }[], blockId?: string): SlackMessageBuilder {
    const buttonElements = buttons.map(button => {
      const buttonElement: SlackButtonElement = {
        type: 'button',
        text: SlackMessageBuilder.plainText(button.text),
        action_id: button.actionId
      };
      
      if (button.value) {
        buttonElement.value = button.value;
      }
      
      if (button.url) {
        buttonElement.url = button.url;
      }
      
      if (button.style) {
        buttonElement.style = button.style;
      }
      
      return buttonElement;
    });
    
    const actions: SlackActionsBlock = {
      type: 'actions',
      elements: buttonElements
    };
    
    if (blockId) {
      actions.block_id = blockId;
    }
    
    this.message.blocks!.push(actions);
    return this;
  }
  
  /**
   * Add a confirmation dialog to the last button in the last actions block
   */
  addConfirmationDialog(
    title: string,
    text: string,
    confirm = 'Confirm',
    deny = 'Cancel',
    style?: 'primary' | 'danger'
  ): SlackMessageBuilder {
    const lastBlock = this.message.blocks![this.message.blocks!.length - 1];
    
    if (lastBlock.type === 'actions') {
      const actionsBlock = lastBlock as SlackActionsBlock;
      const lastElement = actionsBlock.elements[actionsBlock.elements.length - 1];
      
      if (lastElement.type === 'button') {
        const buttonElement = lastElement as SlackButtonElement;
        buttonElement.confirm = {
          title: SlackMessageBuilder.plainText(title),
          text: SlackMessageBuilder.mrkdwn(text),
          confirm: SlackMessageBuilder.plainText(confirm),
          deny: SlackMessageBuilder.plainText(deny)
        };
        
        if (style) {
          buttonElement.confirm.style = style;
        }
      }
    }
    
    return this;
  }
  
  /**
   * Build the final message object
   */
  build(): SlackMessage {
    return { ...this.message };
  }
}

/**
 * Create a new message builder
 * @param text - The fallback text for the message
 */
export function createMessageBuilder(text: string): SlackMessageBuilder {
  return new SlackMessageBuilder(text);
} 