import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    // Lead Basic Information
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    company: {
      type: String,
      trim: true,
      default: null
    },
    position: {
      type: String,
      trim: true,
      default: null
    },
    source: {
      type: String,
      trim: true,
      default: 'CSV Upload'
    },

    // Lead Status
    status: {
      type: String,
      enum: {
        values: ['pending', 'contacted', 'converted', 'rejected', 'not_reachable'],
        message: 'Status must be pending, contacted, converted, rejected, or not_reachable'
      },
      default: 'pending'
    },

    // Assignment Information
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // Can be assigned later
    },

    // Upload Information
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true // Which admin uploaded this lead
    },

    // Additional Fields
    notes: {
      type: String,
      default: null
    },
    lastContactedAt: {
      type: Date,
      default: null
    },
    convertedAt: {
      type: Date,
      default: null
    },

    // Custom fields from CSV (flexible)
    customFields: {
      type: Map,
      of: String,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ uploadedBy: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

// Middleware to update convertedAt when status changes to converted
leadSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'converted' && !this.convertedAt) {
      this.convertedAt = new Date();
    }
    if (this.status === 'contacted' && !this.lastContactedAt) {
      this.lastContactedAt = new Date();
    }
  }
  next();
});

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
